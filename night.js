const rand = (max, min) => {
	return Math.floor(Math.random() * Math.floor(max) + (typeof min !== 'undefined' ? min : 0));
}

let page

const addFcts = async () => {


	// page.on('crashed', function (err) {
	// 	throw 'crashed'
	// });

	// page.np = async () => {
	// 	if (page.closed) { return }
	// 	let page2 = await launch.newPage()
	// 	page2 = addFcts(page2)
	// 	return page2
	// }

	// page.lastPage = async () => {
	// 	const bcPages = await launch.pages()
	// 	let page2 = bcPages[bcPages.length - 1]
	// 	page2 = addFcts(page2)
	// 	return page2
	// }

	return page
}

module.exports = async (userDataDir, noCache) => {
	

	return page
}