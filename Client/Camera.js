// Base class for OrthographicCamera and PerspectiveCamera.
class Camera
{
	// Class constructor.
	constructor(sensitivity, radius, minimumRadius, position)
	{
		// Camera movement sensitivity.
		this.sensitivity = sensitivity;
		// Minimum allowed radius.
		this.minimumRadius = minimumRadius;
		// Camera position.
		this.position = position;
		// Phi. Units are in radians.
		this.phi = Math.arcsin(position[1] / radius);
		// Theta. Units are in radians.
		this.theta = Math.arcsin(-position[2] / (radius * Math.cos(this.phi)));
		/* 
			Camera translation matrix used to calculate the view transform.
			[
				1, 0, 0, -R * cos(θ) * cos(φ)
				0, 1, 0, -R * sin(φ)
				0, 0, 1, R * sin(θ) * cos(φ)
				0, 0, 0, 1
			]
		*/
		this.translation = mat4.fromValues(
			1.0, 0.0, 0.0, -this.position[0],
			0.0, 1.0, 0.0, -this.position[1],
			0.0, 0.0, 1.0, this.position[2],
			0.0, 0.0, 0.0, 1.0
		);
		/* 
			Camera rotation matrix used to calculate the view transform. The x unit vector is the θ unit
			vector, the y unit vector is the φ unit vector, and the z unit vector is the r unit vector.
			[
				-cos(θ), 0, -sin(θ), 0
				-cos(θ) * sin(φ), cos(φ), sin(θ) * sin(φ), 0
				-cos(θ) * cos(φ), -sin(φ), sin(θ) * cos(φ), 0
				0, 0, 0, 1
			]
		*/
		this.rotation = mat4.fromValues(
			-Math.cos(this.theta), 0.0, -Math.sin(this.theta), 0.0,
			-Math.cos(this.theta) * Math.sin(this.phi), Math.cos(this.phi), Math.sin(this.theta) * Math.sin(this.phi), 0.0,
			-Math.cos(this.theta) * Math.cos(this.phi), -Math.sin(this.phi), Math.sin(this.theta) * Math.cos(this.phi), 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}
	// Sets the position.
	setPosition(deltaX, deltaY)
	{
		const radius = vec3.length(this.position);
		vec3.set(
			this.position,
			radius * Math.cos(this.theta - this.sensitivity * deltaX) * Math.cos(this.phi - this.sensitivity * deltaY),
			radius * Math.sin(this.phi - this.sensitivity * deltaY),
			-radius * Math.sin(this.theta - this.sensitivity * deltaX) * Math.cos(this.phi - this.sensitivity * deltaY)
		);
		this.phi = Math.arcsin(this.position[1] / radius);
		this.theta = Math.arcsin(-this.position[2] / (radius * Math.cos(this.phi)));
	}
	// Sets the position.
	setPosition(deltaR)
	{
		const radius = vec3.length(this.position);
		vec3.set(
			this.position,
			(this.position[0] / radius) * (radius + deltaR),
			(this.position[1] / radius) * (radius + deltaR),
			(this.position[2] / radius) * (radius + deltaR)
		);
	}
	// Sets the translation matrix.
	setTranslation()
	{
		this.translation[3] = -this.position[0];
		this.translation[7] = -this.position[1];
		this.translation[11] = this.position[2];
	}
	// Sets the rotation matrix.
	setRotation()
	{
		this.rotation[0] = -Math.cos(this.theta);
		this.rotation[2] = -Math.sin(this.theta);
		this.rotation[4] = -Math.cos(this.theta) * Math.sin(this.phi);
		this.rotation[5] = Math.cos(this.phi);
		this.rotation[6] = Math.sin(this.theta) * Math.sin(this.phi);
		this.rotation[8] = -Math.cos(this.theta) * Math.cos(this.phi);
		this.rotation[9] = -Math.sin(this.phi);
		this.rotation[10] = Math.sin(this.theta) * Math.cos(this.phi);
	}
}