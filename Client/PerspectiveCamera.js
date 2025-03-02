// Perspective camera class.
class PerspectiveCamera extends Camera
{
	// Class constructor.
	constructor(sensitivity, fov, aspectRatio, nearPlane, farPlane, minimumRadius, position)
	{
		const radius = vec3.length(position);
		if (radius < minimumRadius)
			throw "PerspectiveCamera.constructor error code 0x1: The distance from the origin is less than the minimum allowed distance.";
		super(sensitivity, radius, minimumRadius, position);
		// Camera FOV in degrees.
		this.fov = fov;
		// Aspect ratio.
		this.aspectRatio = aspectRatio;
		// Near plane distance.
		this.nearPlane = nearPlane;
		// Far plane distance.
		this.farPlane = farPlane;
	}
	// Creates a perspective projection matrix.
	createProjectionMatrix()
	{
		const projectionMatrix = mat4.create();
		mat4.perspective(
			projectionMatrix,
			(this.fov * Math.PI) / 180.0,
			this.aspectRatio,
			this.nearPlane,
			this.farPlane
		);
		return projectionMatrix;
	}
}