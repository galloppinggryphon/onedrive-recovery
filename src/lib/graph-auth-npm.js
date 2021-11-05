import { msalConfig, msalRequest } from '../config.js'
import { store } from './store.js'

import { Client } from '@microsoft/microsoft-graph-client'
import { PublicClientApplication, InteractionType } from '@azure/msal-browser'
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'

function initializeGraphClient( client, account, scopes ) {
	const authProvider = new AuthCodeMSALBrowserAuthenticationProvider( client, {
		account: account,
		scopes: scopes,
		interactionType: InteractionType.PopUp,
	} )

	// Initialize the Graph client
	return Client.initWithMiddleware( { authProvider } )
}

export default function MsGraphAuth() {
	const msalClient = new PublicClientApplication( msalConfig )
	let graphClient

	const api = {
		currentUser() {
			return this.isAuthorized() && store.get( 'graphUser' )
		},

		isAuthorized() {
			if ( ! graphClient ) {
				return false
			}
			return !! store.get( 'graphAuth' )
		},

		async signIn() {
			if ( graphClient ) {
				console.info( 'Already signed in.' )
				return
			}

			try {
				// Use MSAL to login
				const authResult = await msalClient.loginPopup( msalRequest )
				console.log( `id_token acquired at: ${ new Date().toString() }` )
				console.log( { authResult } )

				store.set( 'graphAuth', authResult.account, 24 * 60 )

				// Initialize the Graph client
				graphClient = initializeGraphClient( msalClient, authResult.account, msalRequest.scopes )

				// Get the user's profile from Graph
				const user = await this.getUserData()

				// Save the profile in session
				store.set( 'graphUser', user )
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

			store.delete( 'graphUser' )
			store.delete( 'graphAuth' )
			msalClient.logoutPopup()
		},

		disconnect() {
			if ( ! this.isAuthorized ) {
				console.warning( `Already signed out.` )
				return false
			}

			console.log( 'Signed out of app.' )

			store.delete( 'graphUser' )
			store.delete( 'graphAuth' )
		},

		async getUserData() {
			if ( ! this.isAuthorized ) {
				return false
			}

			const user = await graphClient
				.api( '/me' )
			// .select('id,displayName,mail,userPrincipalName,mailboxSettings')
				.get()

			store.set( 'graphUser', user )
			return user
		},
	}

	return { graphClient, auth: api }
}
