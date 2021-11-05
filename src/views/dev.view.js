import { filterItems, getDuplicates, getItem, getItems, getItemByPath, getItemsByPath, makePath, restoreAll, restoreItem, sortChildren } from '../modules/onedrive.js'
import { Alert, Break, DataExplorer, Div, DataTableWrapper, El, FileBrowser, P, RichText, Txt, Spinner } from '../lib/ui-elements.js'
import { store } from '../lib/store.js'
import { flattenObject } from '../lib/utils.js'
import dateFormat from 'dateformat'

export default function View( app ) {

	function testData() {
		const data = JSON.parse( `[{"id":"REDACTED!860539","name":"GRAPHTEST","lastModifiedDateTime":"2021-10-28T02:40:05.907Z","size":51078,"folder":{"childCount":32}},{"id":"REDACTED!860825","name":"TEST2","lastModifiedDateTime":"2021-10-29T17:25:00.757Z","size":4402,"folder":{"childCount":2}},{"id":"REDACTED!860593","name":"Test2_restored","lastModifiedDateTime":"2021-10-29T06:45:25.133Z","size":0,"folder":{"childCount":3}},{"id":"REDACTED!860578","name":"TEST3","lastModifiedDateTime":"2021-10-28T04:45:29.58Z","size":7392,"folder":{"childCount":3}},{"id":"REDACTED!860828","name":"TEST4","lastModifiedDateTime":"2021-10-29T20:07:07.593Z","size":0,"folder":{"childCount":12}},{"id":"REDACTED!860847","name":"TEST4","lastModifiedDateTime":"2021-10-29T20:06:23.053Z","size":10051,"folder":{"childCount":5}},{"id":"REDACTED!860849","name":"TEST4","lastModifiedDateTime":"2021-10-29T20:25:51.877Z","size":0,"folder":{"childCount":1}},{"id":"REDACTED!860582","name":"WEB_SAVED","lastModifiedDateTime":"2021-10-19T22:31:10.16Z","size":0,"folder":{"childCount":2}},{"id":"REDACTED!860587","name":"Web3","lastModifiedDateTime":"2021-10-19T22:31:29.56Z","size":0,"folder":{"childCount":0}},{"id":"REDACTED!860583","name":"WEBSAVED2","lastModifiedDateTime":"2021-10-19T22:31:13.453Z","size":4416,"folder":{"childCount":1}},{"id":"REDACTED!860883","name":"xyz123","lastModifiedDateTime":"2021-10-31T01:46:57.98Z","size":3348,"folder":{"childCount":2}}]` )

		const _data = data.map( ( item ) => {
			item.type = item.folder ? 'folder' : 'file'
			item.lastModifiedDateTime = dateFormat( Date.parse( item.lastModifiedDateTime ), 'yy-mmm-dd HH:MM:ss' )
			const _item = flattenObject( item )
			return _item
		}, [] )

		return _data
	}

	return {
		default: {
			title: 'Dev 1',
			menu: true,

			async view() {
				const { msGraph } = app
				const path = 'RESTORE/test-1'

				const results = await getItems( 'REDACTED!866110', {}, { } )

				console.log( { results } )
				const explorer = DataExplorer( '' )
				app.page.append( explorer.html() )
				explorer.add( results )
			},
		},

		test: {
			title: 'Dev 2',
			menu: true,
			async view() {

				const path = 'projects'

				const spinner = Spinner()
				app.page.append( spinner )

				const results = await getItems( 'REDACTED!132556', {}, { includeDeleted: true } )
				// const results = await getItemsByPath( path, {}, { includeDeleted: true } )

				// const onlyDeleted = filterItems( 'deleted-only', path, { includesDeleted: results } )
				spinner.remove()
				FileBrowser( results.json, app.page, { id: 'file-browser' } )

			},
		},

	}
}
