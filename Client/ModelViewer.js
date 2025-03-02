//
class ModelViewer
{
	//
	static #vertexShaderSource =
	`
		attribute vec3 vertexNormal;
		attribute vec3 vertexPosition;
		uniform vec3 ambientLight;
		uniform vec3 directionalLight;
		uniform mat4 modelMatrix;
		uniform mat4 viewTranslationMatrix;
		uniform mat4 viewRotationMatrix;
		uniform mat4 projectionMatrix;
		varying highp vec3 light;

		void main()
		{
			highp mat4 viewMatrix = viewRotationMatrix * viewTranslationMatrix;
			gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(vertexPosition, 1.0);
			highp vec3 directionalLightDirection = normalize(vertexPosition);
			highp float directionalLightComponent = max(dot(vertexNormal, directionalLightDirection), 0.0);
			light = ambientLight + (directionalLightComponent * directionalLight);
		}
	`;
	//
	static #fragmentShaderSource =
	`
		uniform vec4 color;
		varying highp vec3 light;

		void main()
		{
			gl_FragColor = vec4(color.rgb * light, color.a);
		}
	`;
	/*
		Class constructor. root is the top level component. models is the array of part data.
		camera is the camera instance. light is the light instance.
	*/
	constuctor(root, models, camera, light)
	{
		this.root = root;
		this.models = models;
		this.camera = camera;
		this.light = light;
		this.hiddenParts = new LinkedList();
		this.visibleParts = new LinkedList();
		this.viewer = document.querySelector("#model-viewer");
		this.viewer.addEventListener("wheel", this.onZoom, { passive: true });
		this.viewer.addEventListener("mousemove", this.onRotate, { passive: true });
		this.viewer.addEventListener("mousedown", this.onStartRotate);
		this.viewer.addEventListener("mouseup", this.onStopRotate);
		this.isRotating = false;
		this.cursorX = 0.0;
		this.cursorY = 0.0;
		this.context = this.viewer.getContext("webgl");
		if (this.context === null)
			throw "ModelViewer.constructor error code 0x1: Failed to initialize viewer.";
		this.context.clearColor(this.light.ambient[0], this.light.ambient[1], this.light.ambient[2], 1.0);
		this.context.clearDepth(1.0);
		this.context.enable(this.context.DEPTH_TEST);
		this.context.depthFunc(this.context.LEQUAL);
		this.shaderProgram = this.#configureShaders();
		this.context.useProgram(this.shaderProgram);
		this.ambientLight = this.context.getAttribLocation(this.shaderProgram, "ambientLight");
		this.directionalLight = this.context.getAttribLocation(this.shaderProgram, "directionalLight");
		this.model = this.context.getAttribLocation(this.shaderProgram, "modelMatrix");
		this.viewTranslation = this.context.getAttribLocation(this.shaderProgram, "viewTranslationMatrix");
		this.viewRotation = this.context.getAttribLocation(this.shaderProgram, "viewRotationMatrix");
		this.projection = this.context.getAttribLocation(this.shaderProgram, "projectionMatrix");
		this.color = this.context.getAttribLocation(this.shaderProgram, "color");
		this.context.uniform3fv(this.ambientLight, false, this.light.ambient);
		this.context.uniform3fv(this.directionalLight, false, this.light.directional);
		this.context.uniformMatrix4fv(this.projection, false, this.camera.createProjectionMatrix());
		this.context.uniformMatrix4fv(this.viewTranslation, false, this.camera.translation);
		this.context.uniformMatrix4fv(this.viewRotation, false, this.camera.rotation);
		this.root.createBuffers(this, false);
		this.render();
		this.#needsRebuild = false;
		this.#cameraNeedsUpdate = false;
		this.#lightNeedsUpdate = false;
		var node = this.hiddenParts.head;
		while (node != null)
		{
			this.context.bindBuffer(this.context.ARRAY_BUFFER, node.value.vertexBuffer);
			this.context.bufferData(
				this.context.ARRAY_BUFFER,
				new Float32Array(this.models[node.value.modelID]),
				this.context.STATIC_DRAW
			);
			node = node.next;
		}
	}
	//
	#configureShaders()
	{
		const vertexShader = this.#loadShader(this.context.VERTEX_SHADER, ModelViewer.#vertexShaderSource);
		if (!this.context.getShaderParameter(vertexShader, this.context.COMPILE_STATUS))
		{
			const message = `ModelViewer.linkShaders error code 0x1: Failed to load shader. Log: ${this.context.getShaderInfoLog(vertexShader)}`;
			this.context.deleteShader(vertexShader);
			throw message;
		}
		const fragmentShader = this.#loadShader(this.context.FRAGMENT_SHADER, ModelViewer.#fragmentShaderSource);
		if (!this.context.getShaderParameter(fragmentShader, this.context.COMPILE_STATUS))
		{
			const message = `ModelViewer.linkShaders error code 0x2: Failed to load shader. Log: ${this.context.getShaderInfoLog(fragmentShader)}`;
			this.context.deleteShader(vertexShader);
			this.context.deleteShader(fragmentShader);
			throw message;
		}
		const shaderProgram = this.context.createProgram();
		this.context.attachShader(shaderProgram, vertexShader);
		this.context.attachShader(shaderProgram, fragmentShader);
		this.context.linkProgram(shaderProgram);
		// The shaders are no longer needed after linking.
		this.context.deleteShader(vertexShader);
		this.context.deleteShader(fragmentShader);
		if (!this.context.getProgramParameter(shaderProgram, this.context.LINK_STATUS))
			throw `ModelViewer.linkShaders error code 0x3: Failed to initialize shader program. Log: ${this.context.getProgramInfoLog(shaderProgram)}`;
		return shaderProgram;
	}
	//
	#loadShader(type, source)
	{
		const shader = this.context.createShader(type);
		this.context.shaderSource(shader, source);
		this.context.compileShader(shader);
		return shader;
	}
	//
	onRotate(event)
	{
		if (!isRotating)
			return;
		const deltaX = event.clientX - this.cursorX;
		const deltaY = event.clientY - this.cursorY;
		this.cursorX = event.clientX;
		this.cursorY = event.clientY;
		this.camera.setPosition(deltaX, deltaY);
		this.camera.setTranslation();
		this.camera.setRotation();
		this.context.uniformMatrix4fv(this.viewTranslation, false, this.camera.translation);
		this.context.uniformMatrix4fv(this.viewRotation, false, this.camera.rotation);
	}
	//
	onStartRotate(event)
	{
		this.cursorX = event.clientX;
		this.cursorY = event.clientY;
		this.isRotating = true;
	}
	//
	onStopRotate(event)
	{
		this.isRotating = false;
	}
	//
	onZoom(event)
	{
		const deltaR = -event.deltaY * this.camera.sensitivity
		this.camera.setPosition(deltaR);
		this.camera.setTranslation();
		this.context.uniformMatrix4fv(this.viewTranslation, false, this.camera.translation);
	}
	// Renders the model.
	render()
	{
		var node = this.visibleParts.head;
		while (node != null)
		{
			this.context.bindVertexArray(node.value.vertexArray);
			this.context.uniformMatrix4fv(this.model, false, node.value.modelTransform);
			this.context.uniform4fv(this.vertexColor, node.value.color)
			this.context.drawArrays(this.context.TRIANGLES, 0, 3);
			node = node.next;
		}
		if (this.#needsRebuild)
		{
			this.visibleParts = this.root.getVisibleParts();
			this.#needsRebuild = false;
		}
		if (this.#cameraNeedsUpdate)
		{
			this.context.uniformMatrix4fv(this.projection, false, this.camera.createProjectionMatrix());
			this.context.uniformMatrix4fv(this.viewTranslation, false, this.camera.translation);
			this.context.uniformMatrix4fv(this.viewRotation, false, this.camera.rotation);
			this.#cameraNeedsUpdate = false;
		}
		if (this.#lightNeedsUpdate)
		{
			this.context.clearColor(this.light.ambient[0], this.light.ambient[1], this.light.ambient[2], 1.0);
			this.context.uniform3fv(this.ambientLight, false, this.light.ambient);
			this.context.uniform3fv(this.directionalLight, false, this.light.directional);
			this.#lightNeedsUpdate = false;
		}
	}
	// Sets the components properties.
	setComponents(data)
	{
		const paths = data.keys();
		for (var i = 0; i < paths.length; i++)
		{
			const component = this.root.getChild(paths[i]);
			this.#needsRebuild ||= component.setProperties(data[paths[i]], this);
		}
	}
	// Sets the flag to update the camera.
	updateCamera()
	{
		this.#cameraNeedsUpdate = true;
	}
	// Sets the flag to update the light.
	updateLight()
	{
		this.#lightNeedsUpdate = true;
	}
}