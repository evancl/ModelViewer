// Model viewer.
const modelViewer;
// Define event handlers for changing camera and light properties.
// Call modelViewer.updateLight() and modelViewer.updateCamera() to update the model viewer's light and camera.
//
// Entry point for this application.
function main()
{
	// Send request to server to get the number of model IDs.
	const modelIDs = 0;
	const models = new Array(modelIDs);
	for (var i = 0; i < models.length; i++)
	{
		// Send request to server to get the model data.
	}
	// Send request to server to get the root component.
	const root = Component.parse(body);
	const camera = new PerspectiveCamera(
		sensitivity,
		45.0,
		aspectRatio,
		0.1,
		100.0,
		minimumRadius,
		position
	);
	const light = new Light(0xBBBBBB, 0xFFFFFF);
	modelViewer = new ModelViewer(
		root,
		models,
		camera,
		light
	);
	// Render loop.
	while (true)
		modelViewer.render();
}