import { msalConfig, msalRequest } from '../config.js'
import { store } from './store.js'

function initializeGraphClient( msalClient, account, scopes ) {
	// Create an authentication provider
	// eslint-disable-next-line no-undef
	const authProvider = new MSGraphAuthCodeMSALBrowserAuthProvider
		.AuthCodeMSALBrowserAuthenticationProvider( msalClient, {
			account: account,
			scopes: scopes,
			// eslint-disable-next-line no-undef
			interactionType: msal.InteractionType.PopUp,
		} )

	// Initialize the Graph client
	// eslint-disable-next-line no-undef
	return MicrosoftGraph.Client.initWithMiddleware( { authProvider } )

}

export default function MsGraphAuth() {
	// eslint-disable-next-line no-undef
	const msalClient = new msal.PublicClientApplication( msalConfig )
	// let graphClient

	// const authAccount = store.get( 'graphAuth' )

	const authApi = {

		currentUser() {
			return this.isAuthorized() && store.get( 'graphUser' )
		},

		getPermissions() {
			return msalRequest.scopes
		},

		isAuthorized() {
			if ( ! this.graphClient ) {
				return false
			}
			return !! store.get( 'graphAuth' )
		},

		graphClient: {},

		async signIn() {
			if ( this.isAuthorized() ) {
				console.warn( 'Already signed in.' )
				return
			}

			try {
				// Use MSAL to login
				const authResult = await msalClient.loginPopup( msalRequest )
				console.log( `id_token acquired at: ${ new Date().toString() }` )

				console.log( { authResult } )

				store.set( 'graphAuth', authResult.account )

				// Initialize the Graph client
				this.graphClient = initializeGraphClient( msalClient, authResult.account, msalRequest.scopes )

				// Get the user's profile from Graph
				const user = await this.getUserData()

				console.log( { user } )

				// Save the profile in session
				store.set( 'graphUser', user )

				// cookie.set('graphUser', user, 24*60)

			}
			catch ( error ) {
				console.log( error )
				return {
					message: 'Error logging in',
					debug: error,
				}
			}

			return true
		},

		signOut() {
			if ( ! this.isAuthorized ) {
				console.warning( `Already signed out.` )
				return false
			}

			console.log( 'Signing out of MS account.' )

			// cookie.delete('graphAuth')
			// cookie.delete('graphUser')

			store.delete( 'graphUser' )
			store.delete( 'graphAuth' )
			msalClient.logoutPopup()
			return true
		},

		disconnect() {
			if ( ! this.isAuthorized ) {
				console.warning( `Already signed out.` )
				return false
			}

			console.log( 'Signed out of app.' )

			// cookie.delete('graphAuth')
			// cookie.delete('graphUser')

			store.delete( 'graphUser' )
			store.delete( 'graphAuth' )
			return true
		},

		async getUserData() {
			if ( ! this.isAuthorized ) {
				return false
			}

			const user = await this.graphClient
				.api( '/me' )
			// Only get the fields used by the app
			// .select('id,displayName,mail,userPrincipalName,mailboxSettings')
				.get()

			store.set( 'graphUser', user )
			return user
		},
	}

	// Check if existing authorization exists on init
	console.log( { auth: store.get( 'graphAuth' ), user: store.get( 'graphUser' ) } )

	if ( store.get( 'graphAuth' ) ) {
		authApi.graphClient = initializeGraphClient( msalClient, store.get( 'graphAuth' ), msalRequest.scopes )
	}

	return authApi
}
