import { Div, El, ListGroup, DataExplorer, P } from '../lib/ui-elements.js'
import { msalConfig } from '../config.js'

export default function view( app ) {
	const { auth, page, core } = app
	return {
		default: {
			title: 'Home',
			menu: true,

			view() {

				if ( ! msalConfig.auth.clientId ) {
					app.alerts.warning( 'App is not configured', 'Before using, you need to fill in necessary information in config.js. See readme.md for details.' )
				}

				const user = auth.currentUser()
				const jumbotron = Div( 'p-5 mb-4 bg-light rounded-3' )
				const container = Div( 'container-fluid py-5' )
				const heading = El( 'h1', null, 'Onedrive Recovery Tool' )

				let action
				if ( user ) {
					const actionButton = El( 'button', 'btn btn-primary btn-lg', 'Discover deleted items' )
					actionButton.onclick = () => app.router.route( 'onedrive', 'find' )
					action = [
						El( 'h2', 'h5 mb-3', 'Get started' ),
						actionButton,
						El( 'hr', 'mt-4' ),
						P( '', `Account: ${ user.userPrincipalName }` ),
						P( '', `Permissions: ${ auth.getPermissions().join( ', ' ) }` ),
						P( '', El( 'a', { href: 'javascript;' }, 'Sign out' ) ),
					]
				}
				else {
					const signInButton = El( 'button', 'btn btn-primary btn-large',
						'Click here to sign in' )
					signInButton.onclick = core.onSignInClick
					action = [
						El( 'h2', 'h5', 'Connect to MS account' ),
						P( '', 'This app must be connected to your personal Microsoft Onedrive. The first time you sign in, you will be asked to authorize the connection.' ),
						P( '', `Required permissions: ${ auth.getPermissions().join( ', ' ) }` ),
						signInButton,
					]
				}

				jumbotron.append( container )
				container.append( heading )
				container.append(
					P( 'lead mt-5 mb-4 fs-3',
						'A simple experimental tool for recovering deleted files and folders from your personal Onedrive using ', El( 'a', { href: 'https://docs.microsoft.com/en-us/graph/overview' }, 'MS Graph' ), '.' ),
					Div( 'row gx-5 my-5',
						Div( 'col',
							El( 'h2', 'h4', 'Features' ),
							P( '', 'Find and retrieve lost files and folders that can otherwise be hard or impossible to recover from the Onedrive recycle bin.' ),
							P( '', 'Quickly bulk restore an entire folder and its contents.' ),
							P( '', 'Recursively recover deleted files and folders if bulk restore is not possible.' ),
							P( '', 'Version control: select which version to recover.' ),
							Div( 'mt-5',
								El( 'h3', 'h4', 'Why is this tool necessary?' ),
								P( '', `The 'recycle bin' in Onedrive is a travesty - just an endless list of files, neither sortable nor searchable in the provided interface.` ),
								P( '', `Recovering a very large amount of files can be nigh impossible, as only a couple of hundred files can be loaded in the file viewer at one time, and performing operations on more than a few hundred files is really prone to time-outs.` ),
								P( '', `There is always the nuclear option -- a full recovery to a previous date -- but, well, it's nuclear. In short, it's a pain.` ),
							),
						),
						Div( 'col',
							Div( 'card p-4', ...action ),
						),
					),

				)
				page.append( jumbotron )

				if ( user ) {
					const userGraph = DataExplorer( 'User graph data' )
					userGraph.add( user )
					page.append(
						Div( 'my-5',
							userGraph.html(),
						),
					)
				}
			},
		},
	}
}
