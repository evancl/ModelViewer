// An instance of a part or an assembly.
class Component
{
	// Visible parts.
	static #visibleParts;
	// View of data.
	static #dataView;
	// Pointer within the data view buffer.
	static #index;
	// Class constructor.
	constructor()
	{
		// Parent component. This value is null if this component is the root component.
		this.parent = null;
		// Array of child components.
		this.children = null;
		/*
			Model identifier for geometry data. This value is retrieved from the model's properties.
			Configurations must override the default model property value.
		*/
		this.modelID = 0;
		// Vertex array identifier.
		this.vertexArray = 0;
		// Vertex buffer identifier.
		this.vertexBuffer = 0;
		// Color vector.
		this.color = null;
		/*
			Matrix that transforms this component relative to the global coordinate system. It is a product
			of a rotation and translation matrix. This product is computed on the server.
			Rotation matrix:
			[
				r0, r1, r2, 0
				r3, r4, r5, 0
				r6, r7, r8, 0
				0, 0, 0, 1
			]
			Translation matrix:
			[
				1, 0, 0, Δx
				0, 1, 0, Δy
				0, 0, 1, Δz
				0, 0, 0, 1
			]
		*/
		this.transform = null;
		// Name in the feature tree.
		this.name = null;
		// Indicates if this component is hidden.
		this.isHidden = false;
	}
	/*
		Create a buffer for this component and every child component that has a model. Components are added to
		the model viewer's hidden and visible component lists.
	*/
	createBuffers(modelViewer, isParentHidden)
	{
		var isHidden = this.isHidden || isParentHidden;
		if (this.children.length > 0)
		{
			for (var i = 0; i < this.children.length; i++)
				this.children[i].createBuffers(modelViewer, isHidden);
		}
		else
		{
			this.vertexArray = modelViewer.context.createVertexArray();
			modelViewer.context.bindVertexArray(this.vertexArray);
			// Normal attribute.
			modelViewer.context.vertexAttribPointer(
				0,
				3,
				modelViewer.context.FLOAT,
				false,
				24,
				0
			);
			modelViewer.context.enableVertexAttribArray(0);
			// Position attribute.
			modelViewer.context.vertexAttribPointer(
				1,
				3,
				modelViewer.context.FLOAT,
				false,
				24,
				12
			);
			modelViewer.context.enableVertexAttribArray(1);
			this.vertexBuffer = modelViewer.context.createBuffer();
			if (isHidden)
				modelViewer.hiddenComponents.add(this);
			else
			{
				modelViewer.visibleComponents.add(this);
				modelViewer.context.bindBuffer(modelViewer.context.ARRAY_BUFFER, this.vertexBuffer);
				modelViewer.context.bufferData(
					modelViewer.context.ARRAY_BUFFER,
					new Float32Array(modelViewer.models[this.modelID]),
					modelViewer.context.STATIC_DRAW
				);
			}
		}
	}
	// Gets the child component that exists at the given path.
	getChild(path)
	{
		var name;
		var index = path.indexOf("/");
		if (index == -1)
			name = path;
		else
			name = path.substring(0, index);
		for (var i = 0; i < this.children.length; i++)
		{
			if (this.children[i].name == name)
			{
				if (index == -1)
					return this.children[i];
				else
					return this.children[i].getChild(path.substring(index + 1));
			}
		}
		return null;
	}
	// Gets the visible parts in this component.
	getVisibleParts()
	{
		Component.#visibleParts = new LinkedList();
		this.#setVisibleParts();
		return Component.#visibleParts;
	}
	// Sets the component properties if they exist in the given input.
	setProperties(properties, modelViewer)
	{
		if (properties.hasOwnProperty("modelID"))
		{
			this.modelID = properties["modelID"];
			modelViewer.context.bindBuffer(modelViewer.context.ARRAY_BUFFER, this.vertexBuffer);
			modelViewer.context.bufferData(
				modelViewer.context.ARRAY_BUFFER,
				new Float32Array(modelViewer.models[this.modelID]),
				modelViewer.context.STATIC_DRAW
			);
		}
		if (properties.hasOwnProperty("color"))
			this.color = properties["color"];
		if (properties.hasOwnProperty("transform"))
		{
			transform = properties["transform"];
			for (var i = 0; i < 12; i++)
				this.transform[i] = transform[i];
		}
		if (properties.hasOwnProperty("isHidden"))
		{
			this.isHidden = properties["isHidden"];
			return true;
		}
		else
			return false;
	}
	// Sets the visible parts list.
	#setVisibleParts()
	{
		if (this.isHidden)
			return;
		else if (this.children.length == 0)
			Component.visibleParts.add(this);
		else
		{
			for (var i = 0; i < this.children.length; i++)
				this.children[i].#setVisibleParts();
		}
	}
	// Sets the model ID using the data view.
	#setModelID()
	{
		this.modelID = Component.#dataView.getUint32(Component.#index);
		Component.#index += 4;
	}
	// Sets the name using the data view.
	#setName()
	{
		var end = Component.#index + Component.#dataView.getUint8(Component.#index);
		Component.#index++;
		for (; Component.#index <= end; Component.#index++)
			this.name += String.fromCharCode(Component.#dataView.getInt8(Component.#index));
	}
	// Sets the color using the data view.
	#setColor()
	{
		this.color = vec4.create();
		for (var i = 0; i < 4; i++)
			this.color[i] = Component.#dataView.getUint8(Component.#index + i) / 255.0;
		Component.#index += 4;
	}
	// Sets the transform using the data view.
	#setTransform()
	{
		this.transform = mat4.create();
		for (var i = 0; i < 12; i++)
			this.transform[i] = Component.#dataView.getFloat32(Component.#index + i * 4);
		this.transform[12] = 0;
		this.transform[13] = 0;
		this.transform[14] = 0;
		this.transform[15] = 1;
		Component.#index += 48;
	}
	// Sets the hidden state using the data view.
	#setHiddenState()
	{
		this.isHidden = Component.#dataView.getUint8(Component.#index) == 1;
		Component.#index += 1;
	}
	// Sets the children using the data view.
	#setChildren()
	{
		this.children = new Array(Component.#dataView.getUint16(Component.#index));
		Component.#index += 2;
		for (var i = 0; i < this.children.length; i++)
			this.children[i] = Component.#createComponent(this);
	}
	// Creates a component using the data view.
	static #createComponent(parent)
	{
		var component = new Component();
		component.parent = parent;
		component.#setModelID();
		component.#setName();
		component.#setColor();
		component.#setTransform();
		component.#setHiddenState();
		component.#setChildren();
		return component;
	}
	/*
		Returns the root component that is represented by the request body.
		Structure:

		modelID: unsigned integer (4 bytes)
		name length: unsigned char (1 byte)
		name: signed char (1 - 255 bytes)
		color: unsigned integer (4 bytes)
		transform: array of floats (48 bytes)
		isHidden: boolean (1 byte)
		children length: unsigned short (2 bytes)
		children: array of components
	*/
	static parse(body)
	{
		var binaryData = new Uint8Array(body);
		Component.#dataView = new DataView(binaryData.buffer);
		Component.#index = 0;
		return Component.#createComponent(null);
	}
}