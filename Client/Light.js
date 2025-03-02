// Light class.
class Light
{
	// Class constructor.
	constructor(ambient, directional)
	{
		this.ambient = vec3.fromValues(
			((ambient & 0xFF0000) >> 16) / 255.0,
			((ambient & 0xFF00) >> 8) / 255.0,
			(ambient & 0xFF) / 255.0
		);
		this.directional = vec3.fromValues(
			((directional & 0xFF0000) >> 16) / 255.0,
			((directional & 0xFF00) >> 8) / 255.0,
			(directional & 0xFF) / 255.0
		);
	}
}