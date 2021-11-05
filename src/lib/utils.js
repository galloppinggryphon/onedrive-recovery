export async function timeout( request, ms ) {
	let timer
	try {
		return Promise.race( [
			request,
			new Promise( ( success, reject ) => timer = setTimeout( () => reject( 'timeout' ), ms ) ),
		] ).finally( () => clearTimeout( timer ) )
	}
	catch ( err ) {
		console.error( 'timeout error: ', err )
	}
}

export async function delay( ms ) {
	return await new Promise( ( resolve ) => setTimeout( resolve, ms ) )
}

function isError( obj ) {
	return Object.prototype.toString.call( obj ) === '[object Error]'
}

export function toBool( value ) {
	if ( value === 'true' ) {
		return true
	}
	if ( value === 'false' ) {
		return false
	}
	return undefined
}

export function getQueryVars() {
	const urlSearchParams = new URLSearchParams( window.location.search )
	const params = Object.fromEntries( urlSearchParams.entries() )
	return params
}

/**
 * Iterate over an array in parallel with asynchronous functions.
 *
 * @param {any[]} array
 * @param {Function} callback
 */
export async function asyncMapParallel( array, callback ) {
	return await Promise.all( array.map( callback ) )
}

export async function asyncMapSequential( array, callback ) {
	const results = []

	for ( const value of array ) {
		results.push( await callback( value ) )
	}

	return results
}

export function trimSlashes( string ) {
	return string.replace( /^\/+|\/+$/g, '' )
}

export function trimSlashesLeft( string ) {
	return string.replace( /^\//, '' )
}

export function fixDoubleSlashes( string ) {
	return string.replace( /\/+/g, '/' )
}

export function flattenObject( obj, _data = {} ) {
	Object.entries( obj ).forEach( ( [ key, value ] ) => {
		if ( Object( value ) === value && ! Array.isArray( value ) ) {
			Object.assign( _data, flattenObject( value, _data ) )
		}
		else {
			Object.assign( _data, { [ key ]: value } )
		}
	} )
	return _data
}

export function arrayCompare( a, b, compareFunc = ( $a, $b ) => $a === $b ) {
	return a.every( ( value, index ) => {
		return value === undefined && b[ index ] === undefined
			? true
			: compareFunc( value, b[ index ] )
	} )
}

/**
 * On left side only.
 *
 * @param {*} a
 * @param {*} b
 * @param {Function} compareFunc Check for equality between a and b; return true if equal.
 * @returns
 */
export function arrDiff( a, b, compareFunc = ( $a, $b ) => $a === $b ) {
	return a.filter( ( aVal ) => {
		return ! b.some( ( bVal ) => compareFunc( aVal, bVal ) )
	} )
}
