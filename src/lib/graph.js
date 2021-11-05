import { timeout, fixDoubleSlashes } from './utils.js'

const defaultTimeout = 300

export default function MsGraph( graphClient ) {

	const graphApi = {

		setConfig( key, value ) {
			graphClient.config[ key ] = value
			console.log( 'New config: ', graphClient.config )
		},

		async errorHandler( request, quietErrors = false, callback = undefined ) {
			let results = {}
			try {
				results.json = await Promise.resolve( request )
				if ( typeof callback === 'function' ) {
					results = callback( results )
				}
			}
			catch ( err ) {
				results.error = formatError( err )
				if ( ! quietErrors ) {
					console.error( results.error.message )
				}
			}
			return results
		},

		data( path ) {
			console.log( 'REST request:', fixDoubleSlashes( `/me/${ path }` ) )
			return graphClient.api( fixDoubleSlashes( `/me/${ path }` ) )
		},

		async getData( path, { select = undefined, skip = undefined, count = undefined, filter = undefined, search = undefined } = {} ) {
			path = `/me${ path }`

			const data = graphClient
			// .api(restPath)
			// .version("beta")
			// // Only get the fields used by the app
			// //.select('id,displayName,mail,userPrincipalName,mailboxSettings')
			// .get()

			return data
		},

		async request( request ) {
			let results = {}

			try {
				results.data = await timeout( request(), 10000 )
			}
			catch ( e ) {
				console.error( 'Request Error === ', e )
				results.error = e.message
			}

			console.log( results )

			return results
		},

		async getGraphData( restPath, ms = defaultTimeout ) {
			restPath = await Promise.resolve( restPath )
			restPath = `/me${ restPath }`
			console.log( restPath )

			const data = timeout( graphClient
				.api( restPath )
				.version( 'beta' )
			// Only get the fields used by the app
			// .select('id,displayName,mail,userPrincipalName,mailboxSettings')
				.get(), 20000 )

			return { path: restPath, data }
		},
	}

	/**
	 * Wrapper function to handle REST return data.
	 *
	 * @param {Promise<any>} request Graph REST call
	 * @param {Function} resolveCallback Function to execute on return data.
	 * @param {boolean} quietResolveErrors Don't emit errors.
	 * @param {number} timeOut Time in ms
	 * @returns
	 */
	const msGraph = ( request, resolveCallback = undefined, quietResolveErrors = false, timeOut = defaultTimeout ) => {
		const data = ( async function () {
			return await timeout( request(), timeOut )
		} )()
		let graphObj = {
			promise: data,
			resolve( quietErrors = quietResolveErrors, callback = resolveCallback ) {
				return graphApi.errorHandler( data, quietErrors, callback )
			},
		}

		return graphObj
	}

	Object.assign( msGraph, graphApi )

	return msGraph
}

function formatError( error, operation = 'get' ) {
	let errObj = error?.message ? error : { message: 'The request timed out.' }
	delete errObj.stack

	const err = {}
	const verb = operation === 'post' ? 'sending' : 'requesting'
	err.summary = `An error occurred while ${ verb } graph data.`
	err.code = errObj.code ?? 'timeout'
	err.message = `${ err.summary }\n\nDetails: ${ errObj.message } (error code: ${ err.code }).`
	err.details = errObj.message
	err.raw = errObj
	return err
}
