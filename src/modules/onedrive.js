import { onedriveConfig } from '../config.js'
import { arrDiff, asyncMapParallel, asyncMapSequential, delay, trimSlashes } from '../lib/utils.js'
import { Alert, Div, DataExplorer, El, MultiEl } from '../lib/ui-elements.js'

const { log } = console

// Bind app object to this file
let app

function init( appBinding ) {
	app = appBinding
}

function getQueryString( query = { includeDeleted: undefined, includeChildren: false, expand: false, select: 'name,id,parentReference', orderBy: 'name', selectChildren: undefined, limit: undefined }, defaultQuery = {} ) {
	Object.assign( query, defaultQuery )
	const { expand, includeChildren, includeDeleted, limit, orderBy, select, selectChildren } = query

	const _query = []

	if ( expand || includeChildren ) {
		let qExpand = 'expand=children'
		// let _select = selectChildren ? selectChildren : ( select ?? select )
		qExpand = selectChildren ? `${ qExpand }(select=${ selectChildren })` : qExpand
		_query.push( qExpand )
	}
	if ( includeDeleted ) {
		_query.push( 'includeDeletedItems=true' )
	}
	if ( select ) {
		let qSelect = `select=${ select }`
		// const params = select.split('children')
		qSelect = ( includeChildren || expand ) && select.indexOf( 'children' ) === -1 ? `${ qSelect },children` : qSelect
		_query.push( qSelect )
	}
	if ( orderBy ){
		_query.push( `orderby=${ orderBy }` )
	}
	if ( limit ) {
		_query.push( `top=${ limit }` ) // limit = 5000
	}

	return _query.length ? `?${ _query.join( '&' ) }` : ''
}

export async function resolveData( dataOrRequest ) {
	const request = await Promise.resolve( dataOrRequest )
	return await request && request.resolve ? request.resolve() : request
}

export function makePath( ...path ) {

	// _path = trimSlashes( path )
	const driveRoot = `${ onedriveConfig.drive }/root`
	let restPath = trimSlashes( path.join( '/' ) )

	if ( ! restPath || restPath === '/' ) {
		return `/drives/${ driveRoot }`
	}

	// restPath = `/${ restPath }`
	let splitPath = restPath.split( driveRoot )
	if ( splitPath.length > 1 ) {
		let trimPath = trimSlashes( splitPath[ 1 ] )
		trimPath = trimPath.replace( /^:\/?|:$/g, '' )
		// splitPath = splitPath[ 1 ].split( ':' )
		// restPath = splitPath[ 1 ] || splitPath[ 0 ]
		restPath = trimPath
	}

	restPath = `:/${ escape( restPath ) }:/`
	// restPath = fixDoubleSlashes( restPath )

	// restPath = segments[ 1 ] || restPath
	// restPath = fixDoubleSlashes( restPath )
	restPath = `/drives/${ driveRoot }${ restPath }`
	// console.log( 'PATH:', restPath )
	return restPath
}

function ChildrenResolver( resolved = {}, itemParser = undefined ) {
	resolved.json = []

	return ( data ) => {
		const { json, error } = data

		Object.assign( resolved, {
			...error && { error },
			...json[ '@odata.count' ] && { total: json[ '@odata.count' ] },
			...json[ '@odata.nextLink' ] && { nextLink: json[ '@odata.nextLink' ] },
		} )

		const count = json?.value.length
		if ( ! count ) {
			return resolved
		}

		if ( typeof itemParser === 'function' ) {
			resolved.json = json.value.map( itemParser )
		}
		else {
			resolved.json = json.value
		}

		return resolved
	}
}

function ItemResolver( resolved = {} ) {
	return ( data ) => {
		return { ...resolved, ...data }
	}
}

export async function getItem( itemId, options = { resolve: undefined, quietErrors: undefined, timeOut: undefined }, query = { includeChildren: undefined, includeDeleted: undefined, select: undefined, selectChildren: undefined, sortChildren: undefined } ) {
	const { msGraph } = app

	const defaultOptions = { resolve: true, quietErrors: false, timeOut: onedriveConfig.defaultTimeout }
	const { resolve, quietErrors, timeOut } = Object.assign( defaultOptions, options )

	const defaultQuery = { select: onedriveConfig.defaultSelect, selectChildren: onedriveConfig.defaultChildrenSelect }
	const queryString = getQueryString( query, defaultQuery )

	const restPath = `/drive/items/${ itemId }${ queryString }`
	const returnObject = {
		itemId,
		restPath,
		queryString,
	}

	const results = msGraph(
		() => msGraph.data( restPath ).get(),
		ItemResolver( returnObject ),
		quietErrors,
		timeOut,
	)
	return resolve ? results.resolve() : { ...returnObject, ...results }
}

export async function getItems( itemId, options = { resolve: undefined, quietErrors: undefined, timeOut: undefined }, query = { includeDeleted: undefined, limit: undefined, select: undefined } ) {
	const { msGraph } = app

	const defaultOptions = { resolve: true, quietErrors: false, timeOut: onedriveConfig.defaultTimeout }
	const { resolve, quietErrors, timeOut } = Object.assign( defaultOptions, options )
	const defaultQuery = { select: onedriveConfig.defaultSelect, limit: onedriveConfig.defaultLimit }
	const queryString = getQueryString( query, defaultQuery )
	const restPath = `/drive/items/${ itemId }/children${ queryString }`
	const returnObject = {
		itemId,
		restPath,
		queryString,
	}

	const results = msGraph(
		() => msGraph.data( restPath ).get(),
		ChildrenResolver( returnObject ),
		quietErrors,
		timeOut,
	)
	return resolve ? results.resolve() : { ...returnObject, ...results }
}

// sortChildren: 'lastModifiedDateTime', sortDescending: true
export async function getItemByPath( path, options = { resolve: undefined, quietErrors: undefined, timeOut: undefined }, query = { includeChildren: undefined, includeDeleted: undefined, select: undefined, selectChildren: undefined, sortChildren: undefined } ) {
	const { msGraph } = app

	const defaultOptions = { resolve: true, quietErrors: false, timeOut: onedriveConfig.defaultTimeout }
	const { resolve, quietErrors, timeOut } = Object.assign( defaultOptions, options )

	const defaultQuery = { select: onedriveConfig.defaultSelect, selectChildren: onedriveConfig.defaultChildrenSelect }
	let queryString = getQueryString( query, defaultQuery )

	const restPath = makePath( path )
	const returnObject = {
		path,
		restPath,
		queryString,
	}

	const results = msGraph( () => msGraph.data( restPath + queryString ).get(), ItemResolver( returnObject ), quietErrors, timeOut )

	return resolve ? results.resolve() : { ...returnObject, ...results }
}

export async function getItemsByPath( path, options = { resolve: undefined, quietErrors: undefined, timeOut: undefined }, query = { includeDeleted: undefined, limit: undefined, select: undefined, sortChildrenX: 'lastModifiedDateTime', sortDescending: true } ) {
	const defaultOptions = { resolve: true, quietErrors: false, timeOut: onedriveConfig.defaultTimeout }
	const { resolve, quietErrors, timeOut } = Object.assign( defaultOptions, options )

	const override = { includeChildren: false }
	const defaultQuery = { select: onedriveConfig.defaultSelect, limit: onedriveConfig.defaultLimit } // 400 is max
	const _query = Object.assign( defaultQuery, query, override )
	let queryString = getQueryString( _query, defaultQuery )

	const { msGraph } = app

	// First get directory ID
	const dir = await getItemByPath( path, { quietErrors, timeOut }, { includeDeleted: _query.includeDeleted } ) // msGraph( () => msGraph.data( restPath ).get(), undefined, quietErrors )

	if ( dir.error ) {
		return dir
	}

	const pathId = dir.json.id

	console.log( { pathId } )

	const restPath = `/drive/items/${ pathId }/children${ queryString }`

	const returnObject = {
		path,
		restPath,
		queryString,
	}

	const results = msGraph(
		() => msGraph.data( restPath ).get(),
		ChildrenResolver( returnObject ),
		quietErrors,
		timeOut,
	)
	return resolve ? results.resolve() : { ...returnObject, ...results }
}

export async function getDuplicates( path, target = undefined, options = { quietErrors: undefined }, query = { includeDeleted: undefined, select: undefined, sortChildren: undefined, sortDescending: undefined } ) {
	const override = { sortChildren: 'lastModifiedDateTime', sortDescending: true }
	// const defaultQuery = { selectChildren: onedriveConfig.defaultSelect }
	const _query = Object.assign( query, override )
	const _options = Object.assign( options, { resolve: true } )

	// Get parent item
	const _path = trimSlashes( path )
	let parentPath = path
	let _target = target
	if ( ! _target ){
		if ( _path.indexOf( '/' ) >= 0 ) {
			let parts = _path.split( '/' )
			parentPath = parts[ 0 ]
			target = parts[ 1 ]
		}
		else {
			parentPath = ''
			target = _path
		}
	}

	_target = trimSlashes( _target )
	parentPath = makePath( parentPath )

	const searchItems = await getItemsByPath( parentPath, _options, _query )
	console.log( { searchItems } )

	if ( ! searchItems.error && searchItems?.json?.length ) {
		const results = searchItems.json.filter( ( o ) => o.name === _target )
		return results
	}
}

/**
 *
 * includesDeleted: deleted + normal files
 *
 *
 * @param {'deleted-only'|'no-deleted'} filterFlag
 */
export async function filterItems( filterFlag, restPath, graphData = { includesDeleted: undefined, existingItems: undefined } ) {
	const { includesDeleted, existingItems } = graphData
	let includeDeleted = ! includesDeleted

	const resultsA = await resolveData( includesDeleted || existingItems )
	const resultsB = await getItemsByPath( restPath, {}, { includeDeleted } )

	if ( resultsA.error ) {
		return resultsA
	}

	if ( resultsB.error ) {
		return resultsB
	}

	const dataA = resultsA.json
	const dataB = resultsB.json

	if ( ! dataB || ! dataB.length ) {
		if ( includesDeleted && filterFlag === 'deleted-only' ) {
			return dataA
		}
		if ( existingItems && filterFlag === 'no-deleted' ) {
			return dataA
		}
		return []
	}

	const compareData = arrDiff( dataA, dataB, ( a, b ) =>{
		return a.id === b.id
	} )

	return compareData
}

// const defaultOptions = { resolve: true, quietErrors: false, timeOut: onedriveConfig.defaultTimeout }
//
export async function restoreItem( id, options = { restoreToId: undefined, quietErrors: undefined, timeOut: undefined, attempt: undefined, maxAttempts: undefined } ) {
	const { restoreToId = undefined, quietErrors = true, timeOut = onedriveConfig.defaultTimeout, attempt = 1, maxAttempts = 5 } = options

	if ( attempt === 1 ) {
		console.log( '### Restoring item: ', id, '###' )
	}
	else {
		console.warn( '### Attempting to restore item:', id, ` (#${ attempt }/${ maxAttempts }) ###` )
	}

	const { msGraph } = app
	const restoreTo = restoreToId ? { parentReference: { id: restoreToId } } : {}
	const request = msGraph(
		() => msGraph.data( `drive/items/${ id }/restore` ).post( restoreTo ),
		undefined,
		quietErrors,
		timeOut,
	)

	const results = await request.resolve( )

	if ( results.error ) {
		console.error( 'Failed to restore item: ', id )
		if ( results.error.code === 'generalException' && attempt < maxAttempts ) {
			console.log( 'Waiting to try again...' )
			await delay( 100 * attempt )
			return await restoreItem( id, { restoreToId, quietErrors, timeOut, attempt: attempt + 1 } )
		}
	}

	return results
}

/**
 * ! This function is unstable.
 *
 * @param {} path
 * @returns
 */
export async function pathExists( path ) {
	const item = await getItemByPath( path, { quietErrors: true }, { includeDeleted: false } )
	if ( item.error ) {
		if ( item.error.code === 'itemNotFound' ) {
			return false
		}
		return item.error
	}

	return true
}

export async function itemExists( itemId ) {
	const item = await getItem( itemId, { quietErrors: true }, { includeDeleted: false } )
	if ( item.error ) {
		if ( item.error.code === 'itemNotFound' ) {
			return false
		}
		return item.error
	}

	return true
}

// , orderBy = 'lastModifiedDateTime'
export function sortChildren( children ) {
	return children.reduce( function( prev, current ) {
		// If times match, select the item with the higher number after the `!` in the ID
		if ( prev.lastModifiedDateTime === current.lastModifiedDateTime ) {
			const prevId = parseInt( `${ prev.id }`.split( '!' )[ 1 ] )
			const currentId = parseInt( `${ current.id }`.split( '!' )[ 1 ] )
			return ( prevId > currentId ) ? prev : current
		}

		return ( prev.lastModifiedDateTime > current.lastModifiedDateTime ) ? prev : current
	} )
}

function ItemLogger ( logs ){
	const { stats, duplicateLog } = logs
	const duplicateItems = {
		files: {},
		folders: {},
	}
	const fsItems = {
		files: {},
		folders: {},
	}
	const uniqueItems = {
		files: [],
		folders: [],
	}

	return {
		get files() {
			return Object.values( fsItems.files )
		},
		get folders() {
			return Object.values( fsItems.folders )
		},
		/**
		 *
		 * @param {'files'|'folders'} type
		 * @param {object} item
		 */
		add( type, item ){
			// stats[ type ]++
			// console.error( 'err' )
			const { id, name } = item
			const items = fsItems[ type ]

			if ( uniqueItems[ type ].includes( name ) ) {
				const duplicates = duplicateItems[ type ]
				duplicates[ name ] = duplicates[ name ] ?? []
				duplicates[ name ].push( item )

				// Remove any items already added to file list
				const prev = Object.values( items ).find( ( x ) => x.name === name )
				if ( prev ) {
					duplicates[ name ].push( prev )
					delete items[ prev.id ]
				}
			}
			else {
				uniqueItems[ type ].push( name )
				items[ id ] = item

			}
		},

		parseDuplicates( type ){
			const duplicates = Object.entries( duplicateItems[ type ] )
			// const duplicateFiles = Object.entries( _children.duplicateFiles )
			if ( duplicates.length ) {
				const unique = duplicates.map( ( [ key, items ] ) => {
					const item = sortChildren( items )
					const { name, parentReference, folder } = items[ 0 ]
					const path = `${ parentReference.path }/${ name }`
					const duplicate = {
						type: folder ? 'folder' : 'file',
						itemName: name,
						path,
						recoveredId: item.id,
						duplicates: items.reduce( ( instances, _item ) => {
							const { id, lastModifiedDateTime, size } = _item
							const childCount = _item?.folder?.childCount
							instances[ id ] = { lastModifiedDateTime, size, childCount }
							return instances
						}, {} ),
					}

					duplicateLog[ path ] = duplicate
					stats.duplicates[ type ]++
					return item
				} )

				// Add selected unique items to file list
				fsItems[ type ] = unique.reduce( ( results, item ) => {
					results[ item.id ] = item
					return results
				}, fsItems[ type ] )

				return unique
			}
		},

		getItems() {
			return fsItems
		},
	}

	function newDuplicateError( items, recoveredId ){
		const { name, parentReference, folder } = items[ 0 ]
		const path = `${ parentReference.path }/${ name }`
		const type = folder ? 'folder' : 'file'

		const duplicate = {
			type,
			itemName: name,
			path,
			recoveredId,
			duplicates: items.reduce( ( instances, item ) => {
				const { id, lastModifiedDateTime, size } = item
				const childCount = item?.folder?.childCount
				instances[ id ] = { lastModifiedDateTime, size, childCount }
				return instances
			}, {} ),
		}

		// if ( ! ( 'skippedDuplicates' in parentDir ) ) {
		// 	parentDir.skippedDuplicates = []
		// }
		// parentDir.skippedDuplicates.push( duplicate )
		duplicateLog[ path ] = duplicate
	}
}

export async function restoreAll( rootItem, filters = undefined, restoreToId = undefined ) {
	const hardLimit = 100
	const tryBulkRestore = true

	const filter = {
		files: [],
		folders: [ 'node_modules' ],
	}

	log( '#########################################',
		'\n=== === === STARTING RECOVERY === === ===',
		'\n#########################################' )
	log( 'Recovering item: ', rootItem )

	const display = Div( 'pb-5 pt-3 vstack gap-5' )
	const status = Alert( 'Working on it...', '', { addClass: 'p-5', spinner: true }, 'current', 'totalFolderCount', 'totalFileCount', 'recoveredFolderCount', 'recoveredFileCount', 'status' )

	const displayCurrentFolder = ( item ) => status.setMsg( `Current folder: ${ item }`, 'current' )
	const displayTotalFolderCount = ( item ) => status.setMsg( `Processed folders: ${ item }`, 'totalFolderCount' )
	const displayTotalFileCount = ( item ) => status.setMsg( `Processed files: ${ item }`, 'totalFileCount' )
	const displayRecoveredFolderCount = ( item ) => status.setMsg( `Recovered folders: ${ item }`, 'recoveredFolderCount' )
	const displayRecoveredFileCount = ( item ) => status.setMsg( `Recovered files: ${ item }`, 'recoveredFileCount' )
	const displayStatus = ( item ) => status.setMsg( Div( 'mt-2', item ), 'status' )

	display.append( status )
	app.page.append( display )

	const _getFolderInfo = async ( pathOrId, logs ) => {
		let path
		let folder
		let folderOptions = { includeDeleted: true, select: 'id,name,parentReference' }

		if ( pathOrId.split( '!' ) ) {
			folder = await getItem( pathOrId, {}, folderOptions )
		}
		else {
			path = makePath( pathOrId )
			folder = await getItemByPath( path, {}, folderOptions )
		}

		if ( folder.error ) {
			logs.readErrors.push( { pathOrId, context: 'folder', error: folder.error } )
			return
		}

		return folder
	}

	let i = 0
	let abort = false

	const _getChildren = async ( parent, logs ) => {
		const { stats } = logs

		const request = await getItems( parent.id, {}, { includeDeleted: true, select: 'id,name,parentReference,folder,lastModifiedDateTime,size' } )

		if ( request.error ) {
			logs.readErrors.push( { id: parent.id, name: parent.name, context: 'children', path: parent.parentReference.path, error: request.error } )
			return
		}

		const children = request.json

		const itemLogger = children.reduce( ( _itemLogs, item ) => {
			const type = item.folder ? 'folders' : 'files'
			stats.processed[ type ]++
			_itemLogs.add( type, item )

			return _itemLogs
		}, ItemLogger( logs ) )

		displayTotalFileCount( stats.processed.files )
		displayTotalFolderCount( stats.processed.folders )

		itemLogger.parseDuplicates( 'files' )
		itemLogger.parseDuplicates( 'folders' )

		// log( '##### _getChildren #####' )
		// log( 'duplicates\n', { duplicateFiles, duplicateFolders } )
		// log( 'files', itemLogger.files )
		// log( 'folders', itemLogger.folders )
		// log( '--------------------------' )

		return {
			files: itemLogger.files,
			folders: itemLogger.folders,
		}
	}

	const _restoreFiles = async( files, logs ) => {
		const { notDeletedErrors, recoveryErrors, stats } = logs
		const dir = {}

		const items = await asyncMapSequential( files, async ( item ) => {
			log( '===== RESTORING FILE:', item.name, '=====' )

			const result = await restoreItem( item.id, { quietErrors: true } )

			if ( result.error ) {
				const errorItem = { itemId: item.id, name: item.name, path: item.parentReference.path }

				if ( result.error.raw.code === 'notAllowed' && itemExists( item.id ) ) {
					notDeletedErrors.push( errorItem )
					stats.notDeleted++
				}
				else {
					errorItem.error = result.error.raw
					recoveryErrors.push( { itemId: item.id, name: item.name, path: item.parentReference.path, error: result.error.raw } )
				}
				return
			}
			else {
				dir[ item.name ] = item.id
				stats.recovered.files++
				displayRecoveredFileCount( stats.recovered.files )
			}
			return item
		} )

		return {
			dir,
			items: items.filter( ( x ) => x !== undefined ),
		}
	}

	const restoreRecursively = async ( pathOrId, logs = undefined ) => {
		i++
		const dirTree = {}

		// On first call
		if ( ! logs ) {
			logs = {
				stats: {
					notDeleted: 0,
					processed: {
						files: 0,
						folders: 0,
					},
					duplicates: {
						files: 0,
						folders: 0,
					},
					recovered: {
						files: 0,
						folders: 0,
					},
					filtered: 0,
				},
				duplicateLog: {},
				notDeletedErrors: [],
				readErrors: [],
				recoveryErrors: [],
				filteredItems: [],
			}
		}

		const { stats } = logs

		let currentFolder = pathOrId
		if ( typeof pathOrId === 'string' ) {
			const item = await _getFolderInfo( pathOrId, logs )
			if ( ! item ) {
				console.warn( 'Could not open path or ID:', pathOrId )
				return { dirTree, logs }
			}
			currentFolder = item.json
		}

		log( '===============================================\n',
			'### OPENED FOLDER:', currentFolder.name, '###',
			'\n===============================================' )

		const currentPath = `${ currentFolder.parentReference.path }/${ currentFolder.name }/`
		displayCurrentFolder( currentPath )

		// Filter
		if ( currentFolder.name === 'node_modules' ) {
			logs.filteredItems.push( { id: currentFolder.id, name: currentFolder.name, path: currentFolder.parentReference.path, match: 'node_modules' } )
			stats.filtered++
			return { dirTree, logs }
		}

		// Try bulk restore first
		let bulkRestoreSuccess = false
		if ( tryBulkRestore ) {
			log( '*** Attempting bulk restore ***' )
			const result = await restoreItem( currentFolder.id, { timeOut: 10 * 1000, maxAttempts: 1 }, false )

			if ( result.error ) {
				console.warn( `Bulk restore of item ${ currentFolder.name } failed.` )
				log( 'Details: ', result.error )
				log( 'Now trying recursive restore (much slower).' )
			}
			else {
				log( '*** Success! Item and all children restored ***' )
				bulkRestoreSuccess = true
				stats.recovered.folders++
				stats.processed.folders++
				dirTree[ currentFolder.name ] = {
					id: currentFolder.id,
					bulkRestore: true,
				}
			}
		}

		if ( ! bulkRestoreSuccess ){
			displayStatus( 'Bulk restore failed or turned off, enabling recursive mode (much slower).' )

			const children = await _getChildren( currentFolder, logs )

			if ( children ) {
				const { files, folders } = children
				dirTree[ currentFolder.name ] = {
					id: currentFolder.id,
				}

				if ( files.length ) {
				// Check if parent folder is deleted
				// - in that case, it should be counted too
					const parentitemExists = await itemExists( files[ 0 ].parentReference.id )
					if ( parentitemExists ) {
						stats.recovered.folders++
					}

					const { items, dir } = await _restoreFiles( files, logs )
					if ( items.length ) {
					// Object.assign( dirTree[ currentFolder.name ], { files: dir } )
					// dirTree[ currentFolder.name ] = dir
						dirTree[ currentFolder.name ].files = dir
					}
				}

				// Iterate through folders recursively in parallel
				if ( folders.length ) {
				// const dir = dirTree[ currentFolder.name ]
					dirTree[ currentFolder.name ].folders = {}
					await asyncMapParallel( folders, async ( item ) => {
						const results = await restoreRecursively( item, logs )

						if ( ! results ) {
							return
						}

						displayRecoveredFolderCount( stats.recovered.folders )

						if ( Object.keys( results.dirTree ) ) {
							dirTree[ currentFolder.name ].folders[ item.name ] = results.dirTree[ item.name ]
						}
					} )
				}
			}
			// Restore empty folder
			else {
				const deleted = itemExists( currentFolder.id ) // await pathExists( path )
				if ( deleted !== true ) {
				// const results = await _restoreFolder( currentFolder, logs )
					const results = await restoreItem( currentFolder.id )

					if ( ! results.error ) {
						logs.stats.recovered.folders++
						dirTree[ currentFolder.name ] = {
							id: currentFolder.id,
						}
					}
				}
				else {
					logs.notDeletedErrors.push( { itemId: currentFolder.id, name: currentFolder.name, path: currentFolder.parentReference.path } )
					logs.stats.notDeleted++
					return
				}
			}
		}

		return { dirTree, logs }
	}

	let results
	try {
		results = await restoreRecursively( rootItem )
	}
	catch ( error ) {
		console.error( error )
		status.replaceWith( Alert( 'A serious error occurred', [ error.message, error.stack ], { type: 'danger' } ) )
		return
	}

	const { dirTree, logs } = results
	const { items, duplicateLog, notDeletedErrors, recoveryErrors, readErrors, filteredItems, stats } = logs

	log( '\n#########################################',
		'\n=== RECOVERY LOGS ===\n\n',
		{ items, duplicateLog, notDeletedErrors, recoveryErrors, readErrors, stats },
		'\n=== RECOVERED FILES ===',
		dirTree,
		'\n#########################################',
	)

	status.remove()

	if ( abort ) {
		explorer.addHtml( Alert( 'Recovery aborted', 'Reached processing limit.', { type: 'warning', addClass: 'mb-4' } ) )
	}

	const recoveredCount = stats.recovered.folders + stats.recovered.files
	const hasDuplicateErrors = Object.keys( duplicateLog ).length

	const processTally = [
		Div( 'row w-50',
			Div( 'col',
				...MultiEl( 'div', '',
					'Processed (total):',
					` - Folders: ${ stats.processed.folders }`,
					` - Files: ${ stats.processed.files }`,
					'Recovered:',
					` - Folders: ${ stats.recovered.folders }`,
					` - Files: ${ stats.recovered.files }`,
				),
			),
			Div( 'col',
				...MultiEl( 'div', '',
					'Duplicates found:',
					` - Folders: ${ stats.duplicates.folders }`,
					` - Files: ${ stats.duplicates.files }`,
					`Folders skipped (filtered):  ${ stats.filtered }`,
					`Files skipped (not deleted): ${ stats.notDeleted }`,
					`Recovery errors: ${ recoveryErrors.length + readErrors.length }`,
				),
			),
		),
	]

	const explorer = DataExplorer( '', { collapsed: true, topLevelOpen: false } )

	if ( readErrors.length || recoveryErrors.length ) {
		if ( ! recoveredCount ) {
			explorer.addHtml( Alert( 'Recovery failed', [ 'No files were recovered.' ], { type: 'danger', titleClass: 'fs-4', addClass: 'p-5' } ) )
		}
		else {
			explorer.addHtml( Alert( 'Recovery completed with errors', [ 'Some files could not be recovered -- review the error log below.' ], { type: 'warning', titleClass: 'fs-4', addClass: 'p-5' } ) )
		}
	}
	else if ( ! recoveredCount ) {
		explorer.addHtml( Alert( 'No files to recover', [ 'No deleted files or folders found.' ], { type: 'info', addClass: 'p-5', titleClass: 'fs-4' } ) )
	}
	else {
		explorer.addHtml( Alert( 'Recovery complete!', [ 'Review the files and directories that were scanned and recovered below.' ], { type: 'success', addClass: 'p-5' } ) )
	}
	if ( hasDuplicateErrors ) {
		explorer.addHtml( Alert( 'Found duplicates', [ 'One or more files with multiple deleted versions were discovered. Review the logs below.' ], { type: 'warning', addClass: 'p-2' } ) )
	}

	explorer.addHtml( Alert( 'Processing Results', [ ...processTally ], { titleClass: 'fs-5' } ) )

	const JsonBox = Div( { display: false },
		El( 'h3', 'h5', 'Raw JSON' ),
	)

	const Pre = ( title, json ) => El( 'details', 'border border-3 p-3 mt-3',
		El( 'summary', '', title ),
		Div( { className: 'contentEditable', contentEditable: true },
			El( 'pre', { className: '' }, JSON.stringify( json, null, 4 ) ),
		),
	)

	if ( recoveredCount ) {
		explorer.add( dirTree, {}, 'Recovered files and folders' )
		JsonBox.append( Pre( 'Recovered files (directory tree)', dirTree ) )
		JsonBox.show()
	}

	if ( readErrors.length ) {
		explorer.add( readErrors, {}, 'Read errors', 'Some folders or files could not be opened for reading.' )
		JsonBox.append( Pre( 'Read errors', readErrors ) )
		JsonBox.show()
	}

	if ( filteredItems.length ) {
		explorer.add( filteredItems, {}, 'Filtered folders', 'Skipped because they matched a filter.' )
	}

	if ( notDeletedErrors.length ) {
		explorer.add( notDeletedErrors, {}, 'Not in the recycle bin', 'These files/folders are not deleted, recovery not necessary.' )
	}

	if ( hasDuplicateErrors ) {
		explorer.add( duplicateLog, {}, 'Skipped duplicates', 'Found several deleted versions of these files. Only the most recently deleted version of each item has been recovered. Other versions remain recoverable.' )
		JsonBox.append( Pre( 'Duplicates', duplicateLog ) )
		JsonBox.show()
	}

	if ( recoveryErrors.length ) {
		explorer.add( recoveryErrors, {}, 'Other recovery errors', 'Unspecified errors.' )
		JsonBox.append( Pre( 'Recovery errors', recoveryErrors ) )
		JsonBox.show()
	}

	explorer.addHtml( JsonBox )
	display.append( explorer.html() )
}

export default init
