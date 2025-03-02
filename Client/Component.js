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
		// Position. An array of floating point numbers.
		this.position = null;
		// Matrix that transforms this component relative to its parent.
		this.relativeTransform = null;
		// Matrix that transforms this component relative to the global coordinate system.
		this.modelTransform = null;
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
				if (#index == -1)
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
		if (properties.hasOwnProperty("position"))
			this.position = properties["position"];
		if (properties.hasOwnProperty("relativeTransform"))
			this.relativeTransform = properties["relativeTransform"];
		if (properties.hasOwnProperty("modelTransform"))
			this.modelTransform = properties["modelTransform"];
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
	// Sets the position using the data view.
	#setPosition()
	{
		this.position = vec3.create();
		for (var i = 0; i < 3; i++)
			this.position[i] = Component.#dataView.getFloat32(Component.#index + i * 4);
		Component.#index += 12;
	}
	// Gets the transform using the data view.
	#getTransform()
	{
		const transform = mat4.create();
		for (var i = 0; i < 16; i++)
			transform[i] = Component.#dataView.getFloat32(Component.#index + i * 4);
		Component.#index += 64;
		return transform;
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
		component.#setPosition();
		this.relativeTransform = component.#getTransform();
		this.modelTransform = component.#getTransform();
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
		position: array of floats (12 bytes)
		relativeTransform: array of floats (64 bytes)
		modelTransform: array of floats (64 bytes)
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