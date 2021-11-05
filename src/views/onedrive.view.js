import { filterItems, getItem, getItems, getItemsByPath, restoreAll } from '../modules/onedrive.js'
import { Alert, DataExplorer, Div, El, FileBrowser, P, RichText, Spinner } from '../lib/ui-elements.js'
import { store } from '../lib/store.js'

export default function view( app ) {
	async function searchItem( refs ) {
		const { explorerContainer, nextStep, resultsContainer, path, select } = refs

		store.set( 'selectedFolder', path )

		const dirListAll = getItemsByPath( path, {}, { includeDeleted: true } )
		const dirListOnlyDeleted = filterItems( 'deleted-only', path, { includesDeleted: dirListAll } )

		const results = await dirListOnlyDeleted
		if ( results.error ) {
			app.page.append( Alert( 'Error', results.error.message, { type: 'danger' } ) )
			return
		}

		FileBrowser( results, explorerContainer, {
			select: true,
			showSpinner: true,
			id: 'file-browser',
			onLoad: () => resultsContainer.show(),
			events: {
				select( itemData ) {
					store.set( 'selectedItem', { name: itemData.name, id: itemData.id } )
					// selectedItem.value = `${ itemData.name } (#${ itemData.id })`
					nextStep.enable()
				},
				deselect() {
					store.set( 'selectedItem', '' )
					// selectedItem.value = 'n/a'
					nextStep.disable()
				},
			},
		} )
	}

	async function runRestore( refs, confirmed = false ) {
		if ( ! confirmed ) {
			const { getItemButton, itemId, itemResults, itemExplorer: explorer, restoreBox } = refs // itemId

			app.page.append( itemResults )

			getItemButton.disable()

			const spinner = Spinner()
			itemResults.append( spinner )
			itemResults.show()

			const query = { includeDeleted: true, select: 'name,id,parentReference,children,file,folder' }
			const item = await getItem( itemId, {}, query )

			console.log( 'Item:', item )

			let children = {}
			if ( item.json.folder ) {
				children = await getItems( itemId, {}, query )
				console.log( 'Children:', children )
			}

			spinner.hide()

			const itemPreview = item.json ?? item.error
			await explorer.add( itemPreview, {}, 'Item info' )

			if ( children.json ) {
				const fbContainer = El( 'div' )
				explorer.addHtml( Div( '',
					El( 'h3', 'h5', 'Folder contents' ),
					fbContainer,
				) )
				FileBrowser( children.json, fbContainer, { id: 'file-browser', showSpinner: false } )
			}

			// itemResults.append( FileBrowser )

			console.log( explorer.lastItemData )

			if ( Object.keys( explorer.lastItemData ).length ) {
				app.page.append( restoreBox )
				// restoreBox.show()
			}
		}
		else {
			const { resultsBox } = refs
			const selectedItem = store.get( 'selectedItem' )
			app.page.append( resultsBox )

			await restoreAll( selectedItem.id )
		}

		return

	}

	return {
		default: {
			title: 'Onedrive',
			menu: false,
		},

		find: {
			// key: 'onedrive',
			title: '1️⃣ Find',
			menu: true,

			async view() {
				const getItemButton = El( 'button', { className: 'btn btn-primary mt-3' }, 'Browse' )
				const itemPathInput = El( 'input', { value: store.get( 'selectedFolder' ), type: 'text', className: 'form-control mt-1', id: 'itemPathInput' } )
				const nextStep = El( 'button', { className: 'btn btn-primary mt-3 fw-bold mt-auto', disabled: true }, 'Recover selected item' )

				const itemExplorer = DataExplorer( 'Discovered items:', true, { header: { tag: 'h3' } } )
				const explorerContainer = Div( { id: 'DataTableWrapper_root' } )
				const resultsContainer = Div( { display: false, className: 'mb-3 mt-5' },
					El( 'h2', 'mb-4 mt-3', 'Browse folder and select item to recover' ),

					Div( 'row gx-3 mb-5 align-items-stretch',
						Div( { className: 'col-7 d-flex align-items-stretch' },
							Div( { className: 'p-4 d-flex flex-column align-items-start', style: { backgroundColor: 'lavender' } },
								P( 'mb-4 fs-5', 'Below are all the deleted items found in the selected folder.' ),
								P( '', 'There may be multiple items with the same name - this means there are more than one version of it in the recycle bin.' ),
								P( 'mb-4', 'Select the file or folder you wish to recover.' ),
								P( '',
									RichText( '⚠ Note: The process is optimized for recovering folders. It therefore is currently only possible to select a single item at a time. ', { bold: true } ),
								),
								nextStep,
							),
						),
						Div( { className: 'col d-flex align-items-stretch' },
							Div( { className: 'p-4', style: { backgroundColor: 'rgb(255, 221, 221)' } },
								El( 'h3', 'fs-6 fw-bold', 'Selecting between multiple versions' ),
								P( '', 'Some hints about what to do:' ),
								El( 'ul', '',
									El( 'li', '', 'Last-modified date: the best indicator of when an item was deleted (but not perfect)' ),
									El( 'li', '', 'Size: byte size of the file/folder - size 0 means empty' ),
									El( 'li', '', 'childCount: number of items contained in a folder' ),
								),
								P( '', 'Note - you can go through this process multiple times.' ),
							),
						),
					),
				)

				const start = Div( 'bg-light p-4 mb-3',
					El( 'h2', '', '1️⃣ Discover deleted items' ),

					Div( 'row',
						Div( 'col-lg-8',
							P( 'mt-4 mb-5', 'Use this tool to find the file or folder you wish to restore. The starting point is the folder where you know the item was deleted from (moving through folders is TBD). Once opened, you can either browse the folder or search for particular items.' ),
							Div( 'row g-3 ',
								Div( 'col d-flex flex-column',
									El( 'label', { className: 'form-label fs-5 fw-bold', for: 'itemPathInput' }, 'Select folder' ),
									// Div( '',
									El( 'small', 'text-muted mt-auto', 'Enter the path on Onedrive of the folder that contains the item you wish to recover. E.g. documents; documents/school/english. Leave blank to open the root folder.' ),
									itemPathInput,
								),
							),
						),
					),
					getItemButton,
				)

				const getItemButtonClick = () => {
					resultsContainer.hide()
					searchItem( { explorerContainer, getItemButton, resultsContainer, itemExplorer, path: itemPathInput.value, nextStep } )
				}
				getItemButton.onclick = getItemButtonClick

				nextStep.onclick = () => app.router.route( 'onedrive', 'restore' )

				app.page.append(
					start,
					resultsContainer,
					explorerContainer,
				)
			},
		},

		restore: {
			title: '2️⃣ Recover',
			menu: true,
			async view() {
				let selectedItemId = store.get( 'selectedItem' )
				selectedItemId = selectedItemId ? selectedItemId.id : ''

				const getItemButton = El( 'button', { className: 'btn btn-primary mt-3' }, 'Retrieve item' )
				// const resetButton = El( 'button', { className: 'btn btn-warning mt-3 ms-2 d-none' }, 'Reset' )
				const itemIdInput = El( 'input', { value: selectedItemId, type: 'text', className: 'form-control w-50', id: 'itemId' } )

				const itemExplorer = DataExplorer( '', { collapsed: false } )

				const resultsBox = Div( 'mt-5',
					El( 'h2', 'my-3 fs-2', 'Recovery results' ),
				)

				const itemResults = Div( { display: false, className: 'bg-light p-4 mb-3 mt-5' },
					El( 'h2', 'fs-3 mb-4', 'Confirm item to recover' ),
					itemExplorer.html(),
				)

				const runRestoreButton = El( 'button', { className: 'btn btn-danger mt-3' }, 'Start recovery' )
				const restoreBox = Div( { className: 'bg-light mb-3 mt-5' },
					El( 'h2', 'bg-warning fs-4 p-4', 'Ready to begin recovery' ),
					Div( 'p-4',
						P( 'fs-5', '⚠ Confirm that this is the folder/file you wish to recover before continuing.' ),
						runRestoreButton,
					),
				)

				const selectItem = Div( 'bg-light p-4 mb-3',
					El( 'h2', 'mb-5', '2️⃣ Recover files and folders' ),

					Div( 'row',
						Div( 'col-6',
							P( '', `Recover files or folders by their ID. If you don't know the item ID, use the discovery tool to find deleted files.` ),
							Div( 'row',
								Div( 'col d-flex flex-column',
									El( 'label', { className: 'form-label fs-5 fw-bold', for: 'itemId' }, 'Item ID' ),
									El( 'small', 'text-muted mt-auto', 'Enter the item ID of the file or folder to recover.' ),
									itemIdInput,
								),
							),
						),
					),
					getItemButton,
				)

				const getItemButtonClick = () => {
					runRestore( { getItemButton, itemResults, itemExplorer, itemId: itemIdInput.value, restoreBox } )
				}
				getItemButton.onclick = getItemButtonClick

				runRestoreButton.onclick = ( e ) => {
					restoreBox.remove()
					runRestore( { resultsBox }, true )
				}

				app.page.append(
					selectItem,
				)
			},
		},
	}
}
