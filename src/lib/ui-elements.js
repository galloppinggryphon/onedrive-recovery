import { JsonViewer } from './json-viewer/json-viewer.js'
import { DataTableView } from './table/data-table.js'
import { resolveData } from '../modules/onedrive.js'
import dateFormat from 'dateformat'

export function parseOptions( options, defaults ) {
	// keys = keys || [...Object.keys(options), ...Object.keys(defaults)]

	if ( ! Object( options ) === options ) {
		console.log( { options, defaults } )
		throw new Error( 'options is not an object.' )
	}

	const keySet = new Set( Object.keys( options ) )
	if ( keySet.has( 'addClass' ) ) {
		keySet.delete( 'className' )
	}
	const keys = [ ...keySet ]

	return keys.reduce( ( _options, key ) => {
		const value = options[ key ]
		const isEmpty = Array.isArray( value )
			? value.filter( ( x ) => x !== undefined || x !== null ).length === 0
			: value === undefined || value === null

		if ( isEmpty ) {
			return _options
		}

		switch ( key ) {
			case 'addClass':
				const defaultVal = _options.className ? _options.className : []
				const addClass = typeof value === 'string' ? value.split( ' ' ) : value
				const className = new Set( [ ...addClass, ...defaultVal ] )
				_options[ 'className' ] = [ ...className ]
				break

			case 'className':
				_options[ key ] = typeof value === 'string' ? value.split( ' ' ) : value
				break

			default:
				_options[ key ] = value
		}
		return _options
	}, defaults )
}

function optionsOrClassName( options ) {
	options = typeof options === 'string' ? options.split( ' ' ) : options
	if ( Array.isArray( options ) ) {
		options = {
			addClass: options,
		}
	}
	else if ( Object( options ) !== options ) {
		options = {}
	}

	return options
}

/**
 * Create HTML element.
 *
 * @param string*} type HTML tag
 * @param {string | string[] | Object<string, string>} options Options object or class name (string or array).
 * @param  {...HTMLElement} node HTML elements to insert
 * @returns {HTMLElement}
 */
export function El( type, options, ...node ) {

	if ( ! type ) {
		console.error( 'El(): Missing type! Defaulting to `div`.' )
		type = 'div'
	}

	options = typeof options === 'string' ? options.split( ' ' ) : options
	if ( Array.isArray( options ) ) {
		options = {
			className: options,
		}
	}
	else if ( Object( options ) === options ) {
		options = parseOptions( options, {} )
	}
	else {
		options = {}
	}

	const specialDirectives = [ 'disabled', 'display', 'refs' ]
	const { directives, props } = Object.entries( options ).reduce( ( results, [ key, value ] ) => {
		const bucket = specialDirectives.includes( key ) ? 'directives' : 'props'
		results[ bucket ].push( { key, value } )
		return results
	}, { directives: [], props: [] } )

	const element = document.createElement( type )

	// note that saving references to nodes like this can prevent them from being garbage collected...
	element.elementRefs = {}

	element.bindRefs = function( ...ref ) {
		this.elementRefs[ ref[ 0 ] ] = ref[ 1 ]
		return this
	}
	element.show = function() {
		this.style.display = ''
		return this
	}
	element.hide = function(){
		this.style.display = 'none'
		return this
	}
	element.disable = function( style = undefined ) {
		element.setAttribute( 'disabled', style )

		if ( typeof style === 'string' ) {
			element.classList.add( style )
		}
	}
	element.enable = function() {
		const style = element.disabled
		if ( style && style !== 'true' ) {
			element.classList.remove( style )
		}
		element.removeAttribute( 'disabled' )
	}
	element.reset = function(){
		this.innerHTML = ''; return this
	}

	props.forEach( ( { key, value } ) => {
		const _value = Array.isArray( value ) ? value.join( ' ' ) : value
		if ( _value ) {
			if ( key === 'style' ) {
				if ( Object( _value ) === _value ) {
					Object.assign( element.style, _value )
				}
			}
			else {
				element[ key ] = _value
			}
		}
	} )

	directives.forEach( ( { key, value } ) => {
		switch ( key ) {
			case 'refs':
				element.elementRefs = value
				break

			case 'disabled':
				if ( ! value ) {
					element.enable()
				}
				else {
					element.disable( value )
				}
				break

			case 'display':
				if ( value === true ) {
					element.show()
				}
				else if ( value === false ) {
					element.hide()
				}
				break
		}
	} )

	if ( Array.isArray( node ) && node.length ) {
		node.forEach( ( el ) => {
			if ( typeof el === 'string' ) {
				element.append( Txt( el ) )
			}
			else {
				element.append( el )
			}
		} )
	}

	return element
}

export function MultiEl( type, options, ...node ) {
	return node.map( ( el ) => El( type, options, el ) )
}

export function Div( options, ...node ) {
	return El( 'div', options, ...node )
}

export function P( options, ...node ) {
	return El( 'p', options, ...node )
}

export function Txt( text ) {
	return document.createTextNode( text )
}

export function RichText( text, options = { bold: undefined, italic: undefined } ) {
	const textEl = Txt( text )
	const el = Object.entries( options ).reduce( ( _el, [ key, value ] ) => {
		if ( ! value ) {
			return _el
		}
		let tag
		switch ( key ) {
			case 'bold': tag = 'b'; break
			case 'italic': tag = 'i'; break
			default: return _el
		}
		return El( tag, '', _el )
	}, textEl )
	return el
}

export function Break() {
	return document.createElement( 'br' )
}

export function Spinner( options = { className: undefined, role: undefined, accessibleText: undefined } ) {
	options = optionsOrClassName( options )
	const spinnerDefaults = {
		className: [ 'spinner-border', 'text-danger' ],
		role: 'status',
		accessibleText: 'Loading...',
	}
	options = parseOptions( options, spinnerDefaults )

	const { accessibleText } = options
	delete options.accessibleText

	return Div( options, Div( 'visually-hidden', accessibleText ) )
}

export function Container( type, options = {}, ...node ) {
	const defaults = { classes: [ 'container-fluid' ] }
	options = parseOptions( options, defaults, [ 'className', 'id', 'role' ] )
	return Div( options, ...node )
}

export const ListGroup = {
	Horizontal( ...node ) {
		return El( 'ul', 'list-group list-group-horizontal', ...node )
	},
	Vertical( ...node ) {
		return El( 'ul', 'list-group', ...node )
	},
	Item( ...node ) {
		return El( 'li', 'list-group-item', ...node ) // flex-fill fs-6
	},
}

export function Alert( title = '', msg = '', options = { type: undefined, spinner: undefined, display: undefined, className: undefined, addClass: undefined, titleTag: undefined, titleClass: undefined }, ...row ) {

	function getRow( selectRow ) {
		if ( typeof selectRow === 'number' ) {
			return Object.values( rows )[ selectRow ]
		}
		else {
			return rows[ selectRow ]
		}
	}

	const defaults = {
		type: '',
		spinner: false,
		display: true,
		className: [ 'shadow', 'rounded', 'p-3', 'my-2' ],
		addClass: [],
		titleTag: 'h3',
		titleClass: 'fs-5 fw-bold',
	}

	const { type, spinner, display, className, titleTag, titleClass } = parseOptions( options, defaults )
	const titleNode = El( titleTag, [ 'status-alert-title', titleClass, ...title ? [] : [ 'd-none' ] ], title )
	const wrapper = Div( '', titleNode )

	let addRows = row
	let msgArr = Array.isArray( msg ) ? msg : [ msg ]
	if ( ! addRows.length ) {
		addRows = Array.from( Array( msgArr.length ).keys() )
	}

	const rows = addRows.reduce( ( _rows, name, i ) => {
		_rows[ name ] = Div( [ 'status-alert-msg', `status-alert-msg--${ name }` ] )
		if ( msgArr[ i ] ) {
			_rows[ name ].append( msgArr[ i ] )
		}
		wrapper.append( _rows[ name ] )
		return _rows
	}, {} )

	const spinnerEl = spinner ? Spinner( 'float-start me-4' ) : ''
	const _type = type ? `alert-${ type }` : ''
	const container = Div( [ _type, ...className ], spinnerEl, wrapper )
	container.role = 'alert'

	container.setTitle = ( newTitle ) => titleNode.textContent = newTitle
	container.setMsg = ( newMsg, selectRow = 0 ) => getRow( selectRow ).replaceChildren( newMsg )
	container.appendMsg = ( newMsg, selectRow = 0 ) => getRow( selectRow ).append( newMsg )
	container.addRow = ( newMsg, newRow = undefined ) => {
		const _row = ! newRow || Object.keys( rows.length )
		rows[ _row ] = Div( [ 'status-alert-msg', `status-alert-msg--${ _row }` ], newMsg )
	}
	container.hideRow = () => ''

	if ( ! display ) {
		container.hide()
	}

	return container
}

/**
 *
 * @param {*} newNode
 * @param {*} refNode
 * @param {*} location append, prepend, after, before, replace
 */
function nodeInsert( location, refNode, ...newNode ) {
	let placeholder = El( 'div' )

	if ( location === 'prepend' ) {
		refNode.prepend( ...newNode )
	}
	else if ( location === 'append' ) {
		refNode.append( ...newNode )
	}
	else if ( location === 'before' ) {
		refNode.before( ...newNode )
	}
	else if ( location === 'after' ) {
		refNode.before( ...newNode )
	}
	else if ( location === 'replace' ) {
		refNode.replaceWith( newNode )
	}
}

/**
 *
 * Valid options:
 * - header: { tag, className };
 * - classname
 *
 * @param {string} title
 * @param {boolean} collapsed
 * @param {object} options
 * @returns
 */
export function DataExplorer( title = 'JSON data explorer', parentOptions = { collapsed: undefined, topLevelOpen: undefined, className: '', display: undefined }, parentHeaderOptions = { tag: undefined, className: undefined, addClass: undefined } ) {

	const parentClass = 'dx-container'
	const parentDefaults = {
		collapsed: false,
		className: [ 'vstack', 'gap-5' ],
		display: true,
	}
	const parentHeaderDefaults = {
		tag: 'h2',
		className: 'dx-title',
	}

	const _parentOptions = parseOptions( parentOptions, parentDefaults )
	const _parentHeaderOptions = parseOptions( parentHeaderOptions, parentHeaderDefaults )

	const hTag = _parentHeaderOptions.tag
	delete _parentHeaderOptions.tag

	_parentOptions.className.unshift( parentClass )

	const explorer = Div( _parentOptions )
	if ( title ) {
		explorer.append( El( hTag, _parentHeaderOptions, title ) )
	}

	let lastItemData = {}
	let counter = 0

	const explorerApi = {
		/**
		 * Add graph data to the explorer.
		 *
		 * @param {object} graphData Graph data
		 * @param  {...HTMLElement|string} headerNodes Title (if string) or HTML nodes to add to header
		 * @returns
		 */
		async add( graphData, options = { collapsed: undefined, topLevelOpen: undefined }, ...headerNodes ) {
			counter++

			// const { collapsed } = parseOptions( { collapsed: undefined }, options )
			const _options = Object.assign( parentOptions, options )
			const { collapsed, topLevelOpen } = _options

			if ( headerNodes.length ) {
				if ( typeof headerNodes[ 0 ] === 'string' ) {
					headerNodes[ 0 ] = El( 'h3', 'h5', headerNodes[ 0 ] )
				}
			}
			else {
			// label = label && path ? `${ label } (${ path })` : path || label
			}

			const dxItem = Div( [ `dx-${ counter }`, 'dx-item', 'bg-white', 'p-0', 'shadow-sm' ] )
			const dxMain = Div( [ 'dx-item-title', 'container-fluid', 'p-2' ] )
			const dxSpinner = Spinner( { addClass: 'dx-item-spinner' } )

			const jsonContainer = Div( { className: [ 'dx-item-viewer', 'json-viewer' ], style: { fontSize: '75%' } } ) // add classes

			if ( headerNodes.length ) {
				const dxHeader = Div( [ 'dx-item-header', 'p-2', 'bg-light' ] )
				// const dxTitle = El( 'h3', 'h5', label )
				dxHeader.append( ...headerNodes )
				dxItem.append( dxHeader )
			}

			dxMain.append( dxSpinner )
			dxItem.append( dxMain )
			explorer.append( dxItem )

			console.log( { dxSpinner } )
			const graphResults = await Promise.resolve( graphData )
			if ( graphResults.resolve ) {
				const data = await graphResults.resolve()
				const { error } = data
				if ( error ) {
					const err = Alert( error.summary, error.details, { type: 'danger' } )
					dxSpinner.replaceWith( err )
					return
				}
				lastItemData = data.json
			}
			else {
				lastItemData = graphResults
			}

			const viewer = JsonViewer( lastItemData, collapsed, topLevelOpen )

			jsonContainer.append( viewer.html )
			dxSpinner.replaceWith( jsonContainer )

			return jsonContainer
		},

		addHtml( node ) {
			explorer.append( node )
		},

		html() {
			return explorer
		},

		get lastItemData() {
			return lastItemData
		},
	}

	explorer.explorer = explorerApi

	return explorerApi
}

export function Code( text ) {
	const pre = El( 'pre', 'alert-pre border bg-light p-2' )
	const code = El( 'code', 'text-break text-wrap',
		JSON.stringify( text, null, 2 ) )

	pre.append( code )
	return code
}

export function DataTableWrapper( dataTableConstructor, container = undefined, options = { id: undefined, className: undefined, addClass: undefined, wrapper: { className: undefined } } ) {

	const defaults = { className: [ 'table', 'table-striped', 'table-hover' ], wrapper: {} }
	options = parseOptions( options, defaults )

	const tableEl = El( 'table', options )
	// const containerEl = Div( { id: 'DataTableWrapper_container', className: options?.wrapper?.className || '' }, tableEl )

	if ( container ) {
		container.replaceChildren( tableEl )
	}

	const table = new Promise( ( resolve ) => {
		if ( document.readyState === 'complete' ) {
			resolve( dataTableConstructor( tableEl ) )
		}
		else {
			window.addEventListener( 'DOMContentLoaded', () => {
				resolve( dataTableConstructor( tableEl ) )
			} )
		}
	} )

	return { tableRef: tableEl, dataTable: table }
}

export async function FileBrowser( data, container, options = {
	id: undefined, columns: undefined, select: undefined, showSpinner: true, onLoad: undefined, events: {
		select: undefined, deselect: undefined,
	},
} ) {
	const { columns, events, id, onLoad, select, showSpinner } = options

	const _columns = columns || [ 'name', 'id', 'type', 'lastModifiedDateTime', 'size', 'childCount' ]

	let spinner
	if ( showSpinner ){
		spinner = Spinner()
		container.replaceChildren( spinner )
	}

	if ( select ) {
		_columns.unshift( 'select' )
	}

	const _data = await resolveData( data )
	const tableData = _data.map( ( item ) => {
		item.type = item.folder ? 'folder' : 'file'
		item.lastModifiedDateTime = dateFormat( Date.parse( item.lastModifiedDateTime ), 'yy-mmm-dd HH:MM:ss' )
		item.childCount = item?.folder?.childCount ?? ''
		const returnItem = {}
		_columns.forEach( ( column ) => {
			returnItem[ column ] = item[ column ] === undefined ? '' : item[ column ]
		} )
		return returnItem
	} )

	const tableOptions = {
		select,
		columns: _columns,

		paging: { rows: 50 },
		sort: {
			columns: [ 'name', 'id', 'type' ],
		},
		search: {
			columns: [ 'name', 'id', 'lastModifiedDateTime' ],
		},
		events: [],
	}

	if ( select ) {
		tableOptions.events.push( {
			event: 'select',
			func( e, dt, type, indexes ){
				const row = dt[ type ]( indexes )
				const itemData = row.data()
				if ( typeof events?.select === 'function' ) {
					events.select( itemData, row, dt, type, indexes )
				}
			},
		} )

		tableOptions.events.push( {
			event: 'deselect',
			func( e, dt, type, indexes ){
				const row = dt[ type ]( indexes )
				const itemData = row.data()
				if ( typeof events?.deselect === 'function' ) {
					events.deselect( itemData, row, dt, type, indexes )
				}
			},
		} )
	}

	const dataTable = DataTableWrapper( ( tableEl ) => {
		if ( showSpinner ){
			spinner.remove()
		}

		if ( typeof onLoad === 'function' ) {
			onLoad( tableEl, container )
		}

		return DataTableView( tableData, tableEl, tableOptions )
	}, container, { id } )

	return dataTable
}
