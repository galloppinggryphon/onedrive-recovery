import './table.css'
const DataTable = window.DataTable

/**
 *
 * Examples
 * search: true|false // #todo: { multiple: true|false }
 *
 * sort: {
 * 		order: [ 'select', 'name', 'id', 'type' ],
 * 		by: #todo
 * }
 *
 * search: {
 * 		columns: [ 'name', 'id', 'lastModifiedDateTime' ],
 *		default: #todo
 * },
 *
 * events: [{
 * 		event: 'validEventIdentifier',
 * 		func: ( e, dt, type, indexes ) => {}
 * }]
 *
 * Select event: https://datatables.net/reference/event/select
 *
 * @param {*} data
 * @param {*} domElement
 * @param {*} options
 * @returns
 */
export function DataTableView( data, domElement, options = {
	columns: undefined,
	select: { multiple: undefined },
	sort: { order: undefined, by: undefined },
	search: { default: undefined, columns: undefined },
	paging: { rows: undefined },
	events: undefined,
} ) {
	const { columns, events, paging, search, select, sort } = options

	const tableConfig = {
		dom: 'lftirBp',
		// data: tableData,
		// columns,
		// columnDefs,
		// select: selectOptions,
		// order: defaultSortBy,
		// pageLength,
	}

	tableConfig.data = data.map( ( item ) => {
		if ( select ) {
			item.select = null
		}
		return item
	} )

	tableConfig.columns = columns.reduce( ( results, key ) => {
		results.push( { data: key, title: key } )
		return results
	}, [] )

	tableConfig.columnDefs = []
	tableConfig.order = [ [ 0, 'asc' ] ]
	tableConfig.select = false

	const { rows: pageLength = 10 } = paging

	tableConfig.pageLength = pageLength

	if ( select ) {
		tableConfig.select = {
			// style: true,
			style: 'os',
			selector: 'td:first-child',
		}
		tableConfig.columnDefs.push( {
			orderable: false,
			className: 'select-checkbox',
			targets: 0,
		} )
	}

	if ( sort ) {
		const { order: sortOrder, by: sortBy } = sort
		// columnsSorted = columns.sort( ( a, b ) => {
		// 	console.log( '========' )

		// 	let aPos = sortOrder.indexOf( a.data )
		// 	let bPos = sortOrder.indexOf( b.data )
		// 	aPos = aPos > -1 ? aPos : columns.length
		// 	bPos = bPos > -1 ? bPos : columns.length

		// 	return aPos - bPos
		// } )
	}

	if ( search ) {
		const { columns: searchable, default: searchableDefault } = search

		const searchableColumns = searchable.reduce( ( results, key ) => {
			const i = tableConfig.columns.findIndex( ( item ) => {
				return item.data === key
			} )

			if ( i > -1 ) {
				results.push( i )
			}
			return results
		}, [] )

		tableConfig.columnDefs.push( {
			searchable: true,
			targets: searchableColumns, // Array of columns
		}, {
			searchable: !! searchableDefault,
			targets: '_all',
		} )
	}

	// console.log( '=============================' )
	// console.log( 'data\n', tableData )
	// console.log( 'sortOrder\n', columns && columns.map( ( x ) => x.data ) )
	// console.log( 'selectOptions\n', selectOptions )
	// console.log( 'columnDefs\n', columnDefs )
	// console.log( '=============================' )

	let table = new DataTable( domElement, tableConfig )

	if ( events ) {
		const $ = window.jQuery
		const $table = $( domElement ).DataTable()
		events.forEach( ( item ) => {
			const { event, func } = item
			$table.on( event, func )
		} )
	}

	return table
}
