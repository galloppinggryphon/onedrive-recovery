import './json-viewer.css'
import { Div, El } from '../ui-elements.js'

export function JsonViewer( json, collapsed = false, topLevelOpen = true, options = { collapsible: true, topLevelDrawer: true } ) {
	const { collapsible, topLevelDrawer } = options

	let counter = 0
	let isCollapsed = collapsed
	let isRootCollapsed = ! topLevelOpen

	const prefix = Math.ceil( Math.random() * 1000000 )
	const uid = `json-viewer--${ prefix }`

	const viewerHtml = Div( [ `json-viewer`, uid ] )
	const viewerWrapper = Div( [ `json-viewer-container` ] )

	const jsonHtml = Object.entries( json ).map( ( [ key, value ] ) => parseNode( key, value ) )
	viewerWrapper.append( ...jsonHtml )

	let collapseBtn = collapsible && CollapseButton()
	let preview
	let collapsedUi
	let jsonString = ''

	toggleCollapsed( collapsed )

	if ( topLevelDrawer ) {
		jsonString = JSON.stringify( json )
		preview = Div( 'json__json-preview' )
		collapsedUi = Div( 'json__collapsed-ui',
			El( 'button', [ 'json__expand-root', 'btn', 'btn-sm', 'btn-linkx' ], '+' ),
			preview,
			...collapseBtn && [ collapseBtn ],
		)

		preview.onclick = function() {
			toggleOpenTopLevel()
		}

		toggleOpenTopLevel( topLevelOpen )
		viewerHtml.append( collapsedUi, viewerWrapper )
	}
	else {
		viewerWrapper.prepend( collapseBtn )
		viewerHtml.append( viewerWrapper )
	}

	return {
		collapseAll(){
			toggleCollapsed( true )
		},
		expandAll() {
			toggleCollapsed( false )
		},
		openTopLevel(){
			toggleOpenTopLevel( false )
		},
		closeTopLevel(){
			toggleOpenTopLevel( true )
		},
		html: viewerHtml,
	}

	function CollapseButton() {
		const btn = El( 'button', { className: [ 'json__collapse-button', 'btn', 'btn-link', 'btn-sm', 'bg-white' ], display: false } )

		btn.setText = function () {
			this.textContent = isCollapsed ? 'Expand all' : 'Collapse all'
		}
		btn.onclick = () => toggleCollapsed()
		return btn
	}

	function toggleCollapsed( collapse = undefined ){
		isCollapsed = collapse ?? ! isCollapsed

		if ( isCollapsed ) {
			viewerWrapper.querySelectorAll( '.json__toggle' ).forEach( ( el ) => el.checked = false )
		}
		else {
			viewerWrapper.querySelectorAll( '.json__toggle' ).forEach( ( el ) => el.checked = true )
		}

		collapseBtn.setText()
	}

	function toggleOpenTopLevel( state ) {
		isRootCollapsed = state ?? ! isRootCollapsed
		viewerHtml.classList.toggle( 'json-viewer--root-collapsed' )

		if ( isRootCollapsed ) {
			preview.textContent = `data: ${ jsonString }`
			collapseBtn && collapseBtn.hide()
		}
		else {
			preview.textContent = 'data:'
			collapseBtn && collapseBtn.show()
		}
	}

	function newItem( { key, value, type, children = undefined, isCollapsible = false, level = undefined } ) {
		counter++

		if ( type === 'string' ) {
			value = `'${ value }'`
		}
		else if ( Array.isArray( value ) ) {
			value = 'array'
			if ( ! children.length ) {
				isCollapsible = false
				children = ' []'
			}
		}
		else if ( type === 'object' ) {

			if ( !! value && typeof value.then === 'function' ) {
				value = 'promise'
				children = null
				isCollapsible = false
			}
			else if ( value === null ) {
				value = 'null'
			}
			else {
				value = 'object'
				if ( ! Object.keys( children ).length ) {
					isCollapsible = false
					children = ' {}'
				}
			}
		}
		else if ( type === 'function' ) {
			children = null
			isCollapsible = false
		}

		const id = `json__item_${ prefix }--${ counter }`
		const wrapperClasses = [ 'json__wrapper', ...isCollapsible ? [ 'json--is-collapsible' ] : [] ]
		const wrapperTag = children ? 'label' : 'div'
		const valueClasses = [ 'json__value', `json__value--${ type }` ]

		const $item = Div( 'json__item' )
		const $wrapper = El( wrapperTag, wrapperClasses )
		const $key = Div( 'json__key', key )
		const $value = Div( valueClasses, value )

		// if(key === 'id') {

		// }
		if ( level !== undefined ) {
			$item.dataset.level = level
		}

		let $checkbox = '', $children = []
		if ( children ) {
			$children = Array.isArray( children ) ? children : [ children ]
			$checkbox = El( 'input', 'json__toggle' )
			$checkbox.setAttribute( 'type', 'checkbox' )
			$checkbox.id = id
			$wrapper.setAttribute( 'for', id )

			// $checkbox.setAttribute('for', id)

			if ( ! collapsed ) {
				$checkbox.setAttribute( 'checked', 'checked' )
			}

			// $wrapper.id = id
			$item.append( $checkbox )
		}

		$item.append( $wrapper )
		$wrapper.append( $key, $value, ...$children )
		return $item
	}

	function parseNode( key, node, level = 0 ) {
		level++
		const type = typeof node

		if ( Object( node ) === node ) {
			const children = Object.entries( node ).map( ( [ _key, _node ] ) => parseNode( _key, _node, level ) )
			const multinode = newItem( { key, value: node, type, children, level, isCollapsible: collapsible } )
			// debugger
			return multinode
		}

		return newItem( { key, value: node, type } )
	}

}

// function El( tag, classes = [], ...contents ) {
// 	classes = classes ? ( Array.isArray( classes ) ? classes : [ classes ] ) : undefined
// 	const el = document.createElement( tag )
// 	el.classList.add( ...classes )
// 	if ( contents ) {
// 		el.append( ...contents )
// 	}
// 	return el
// }
