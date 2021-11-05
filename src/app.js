import MsGraph from './lib/graph.js'
import MsGraphAuth from './lib/graph-auth.js'
import { store } from './lib/store.js'
import { Alert, Div, P, El } from './lib/ui-elements.js'
import onedrive from './modules/onedrive.js'
import OnedriveView from './views/onedrive.view.js'
import HomeView from './views/home.view.js'

function __noop(){}

export function App() {
	const defaultView = 'home'

	const api = {
		auth: {},
		alerts: {},
		core: {},
		msGraph: __noop,
		page: {},
		router: {},
	}

	const core = {
		async checkAuth() {
			const { auth, router } = api

			if ( ! auth.isAuthorized() ) {
				router.route( 'home' )
				return
			}

			if ( ! auth.currentUser() ) {
				await auth.getUserData()
			}
			return true
		},

		async onSignInClick() {
			const result = await api.auth.signIn()
			initGraph()

			// console.log( { result, g: api.msGraph } )
			// console.log( 'msGraph', this.msGraph )

			api.router.reset()
			api.navMenu.update()

			if ( result ) {
				const user = api.auth.currentUser()

				api.alerts.info( 'Welcome', `Onedrive Recovery Tool is now connected to the account ${ user.userPrincipalName }` )
			}

		},

		async onSignOutClick() {
			const result = api.auth.signOut()
			api.msGraph = __noop
			api.router.reset()

			if ( result ) {
				api.alerts.info( 'You have been signed out of your Microsoft account', '', { type: 'warning' } )
			}
		},

		async onDisconnectClick() {
			const result = api.auth.disconnect()
			api.msGraph = () => {}
			api.router.reset()

			if ( result ) {
				api.alerts.info( 'You have been signed out the app', '(but not your Microsoft account).', { type: 'warning' } )
			}
		},
	}

	api.auth = MsGraphAuth()

	async function init( ) {

		api.page = Page()
		api.alerts = AlertsTray( api )
		api.router = Router( api )
		api.navMenu = NavMenu( api )
		api.core = core

		const { navMenu, router } = api

		registerMixins( [ 'onedrive', onedrive ] )
		router.registerViews( [ 'home', HomeView ], [ 'onedrive', OnedriveView ] )

		await core.checkAuth()

		initGraph()

		router.setDefaultView( defaultView )
		router.route()
		navMenu.update()

		return api
	}

	function initGraph() {
		if ( api.auth.isAuthorized() ) {
			api.msGraph = MsGraph( api.auth.graphClient )
		}
	}

	function registerMixins( ...addMixin ) {
		addMixin.forEach( ( [ id, MixinFactory ] ) => {
			api[ id ] = MixinFactory( api )
		} )
	}

	return init( )
}

function Router( app ) {
	const { page, auth } = app
	let views = {}
	let registeredViews = {}
	let defaultView

	const fallbackViews = {
		routeError( route ) {
			app.page.replaceChildren(
				El( 'h1', '', 'Routing error' ),
				P( '', 'Invalid route:' ),
				El( 'pre', '', JSON.stringify( route ) ),
			)
		},
		noRoutes() {
			app.page.replaceChildren(
				El( 'h1', '', 'No views!' ),
				P( '', 'No views have been registered.' ),
			)
		},
	}

	const router = {
		setDefaultView( newDefault ) {
			defaultView = newDefault
		},

		registerViews( ...view ) {
			view.forEach( ( [ id, ViewFactory ] ) => {
				// registeredViews[id] = id
				views[ id ] = ViewFactory( app )
			} )

			Object.entries( views ).forEach( ( [ id, subViews ] ) => {
				Object.entries( subViews ).forEach( ( [ subId ] ) => {
					registeredViews[ id ] = [ subId, ...registeredViews[ id ] || [] ]
				} )
			} )
		},

		getViews() {
			return views
		},

		getCurrentView( key = undefined ) {
			const cv = store.get( 'currentView' )
			return key ? cv[ key ] : cv
		},

		parseRoute( ...pathOrRouteArray ){
			let levels
			const pathOrRoute = pathOrRouteArray.filter( ( x ) => x !== undefined )
			if ( pathOrRoute.length > 1 ) {
				levels = pathOrRoute
			}
			else {
				const _pathOrRoute = pathOrRoute[ 0 ]
				if ( Object( _pathOrRoute ) === _pathOrRoute ) {
					levels = _pathOrRoute.path
				}
				else {
					levels = _pathOrRoute.split( '/' )
				}
			}

			let view = defaultView
			let subview = 'default'

			if ( levels.length ) {
				view = levels[ 0 ] === 'default' ? defaultView : levels[ 0 ]
				view = view in registeredViews ? view : defaultView
				subview = levels[ 1 ] && registeredViews[ view ].includes( levels[ 1 ] ) ? levels[ 1 ] : 'default'
			}
			else {
				console.log( 'Empty route, redirecting to default view.' )
			}

			return [ view, subview ]
		},

		getRouteFromView( view, subview ) {
			return { path: [ view, subview ], pathString: `${ view }/${ subview }`, key: `${ view }--${ subview }` }
		},

		isValidRoute( pathOrRoute ) {
			const levels = Object( pathOrRoute ) === pathOrRoute ? pathOrRoute.path : pathOrRoute.split( '/' )

			if ( ! levels || ! levels.length ) {
				return false
			}

			let view = levels[ 0 ] in registeredViews
			if ( ! view ) {
				return false
			}

			if ( levels[ 1 ] ) {
				if ( ! registeredViews[ view ].includes( levels[ 1 ] ) ) {
					return false
				}
			}

			return true
		},

		path( path = '', data = undefined ) {
			console.log( { views } )
			const levels = router.parseRoute( path )
			router.route( ...[ ...levels, data ] )
		},

		route( viewOrPath, subview = undefined, data = undefined, resetAlerts = true ) {
			console.clear()
			page.reset()

			if ( resetAlerts ) {
				app.alerts.reset()
			}

			console.log( '#### Routing request ####\n', { viewOrPath, subview } )

			if ( ! Object.keys( views ).length ) {
				console.error( 'No routes registered.' )
				fallbackViews.noRoutes()
				this.updateNav()
				return
			}

			console.log( 'current', store.get( 'currentView' ) )

			let _route
			if ( ! viewOrPath ) {
				_route = [ store.get( 'currentView' ) ]
				console.log( 'Empty routing request, recalling last view:', _route[ 0 ] )
			}
			else {
				_route = [ viewOrPath, subview ]
			}

			const [ _view, _subview ] = this.parseRoute( ..._route )
			const route = router.getRouteFromView( _view, _subview )

			store.set( 'currentView', route )

			const viewObj = views[ _view ]?.[ _subview ]

			if ( viewObj ) {
				console.log( '### Resolved route ###\n', { view: _view, subview: _subview } )
				viewObj.view( data )
			}
			else {
				console.error( 'Resolve route failed: route not found.' )
				fallbackViews.routeError( route )
			}

			this.updateNav()
		},

		updateNav(){
			const { navMenu } = app
			if ( ! auth.isAuthorized() ) {
				navMenu.hide()
			}
			else {
				navMenu.show()
				navMenu.setCurrent( router.getCurrentView( 'key' ) )
			}
		},

		reset() {
			let view = defaultView
			let subview = 'default'
			this.route( view, subview )
		},
	}
	return router
}

function Page() {
	const page = document.querySelector( '#main-container' )
	page.reset = () => page.innerHTML = ''
	return page
}

function NavMenu( app ) {
	const { auth, router } = app
	const nav = document.querySelector( '#navbarCollapse' )

	let visible = false
	// let activeItem

	const addItem = ( label, view, onClick ) => {
		const navItem = El( 'li', 'nav-item' )
		const navBtn = El( 'button',
			[ 'btn', 'btn-link', 'nav-link', `nav-link--${ view }` ],
			label )
		navBtn.addEventListener( 'click', onClick )
		navItem.append( navBtn )
		// nav.append(navItem);
		return navItem
	}

	const buildNav = () => {
		const shadowNav = El( 'ul', { className: 'navbar-nav me-auto', id: 'authenticated-nav' } )

		const views = router.getViews()
		Object.entries( views ).forEach( ( [ id, subViews ] ) => {
			Object.entries( subViews ).forEach( ( [ subId, viewData ] ) => {
				const { title, menu } = viewData
				if ( menu ) {
					const item = addItem( title, `${ id }--${ subId }`, () => router.route( `${ id }/${ subId }` ) )
					const current = router.getCurrentView( 'path' )
					if ( id === current[ 0 ] && subId === current[ 1 ] ) {
						item.firstElementChild.classList.add( 'active' )
						// activeItem = item
					}
					shadowNav.append( item )
				}
			} )
		} )

		return shadowNav
	}

	const getNav = () => document.querySelector( '#authenticated-nav' )

	const toggleAccountNav = () => {
		const user = auth.currentUser()
		const userName = document.querySelector( '#username' )
		const email = document.querySelector( '#email' )

		if ( user ) {
			const accountMenu = document.querySelector( '#account-nav' )
			userName.textContent = user.displayName
			email.textContent = user.mail || user.userPrincipalName

			const signOut = accountMenu.querySelector( '.sign-out' )

			signOut.onclick = app.core.onSignOutClick

			const disconnect = accountMenu.querySelector( '.disconnect' )
			disconnect.onclick = app.core.onDisconnectClick

			accountMenu.style.display = ''
		}
		else {
			document.querySelector( '#account-nav' ).style.display = 'none'
			userName.textContent = ''
			email.textContent = ''

			// Show a "sign in" button
			// accountNav.className = 'nav-item';
			// var signInButton = El('button', 'btn btn-link nav-link', 'Sign in');
			// signInButton.addEventListener('click', onSignInClick)
			// accountNav.append(signInButton);
		}
	}

	return {
		hide() {
			toggleAccountNav()
			getNav().innerHTML = ''
			visible = false
		},

		show(){
			toggleAccountNav()
			if ( ! auth.isAuthorized() ) {
				this.hide()
				return
			}

			if ( ! visible ) {
				getNav().replaceWith( buildNav() )
				visible = true
			}
		},

		update() {
			toggleAccountNav()
			if ( ! auth.isAuthorized() ) {
				this.hide()
				return
			}

			getNav().replaceWith( buildNav() )
			visible = true
		},

		setCurrent( view ) {
			if ( ! auth.isAuthorized() ) {
				return
			}

			nav.querySelectorAll( '.nav-link' ).forEach( ( el ) => el.classList.remove( 'active' ) )

			const item = nav.querySelector( `.nav-link--${ view }` )
			item && item.classList.add( 'active' )
			// activeItem = item
		},
	}
}

function AlertsTray( app ) {
	const { page } = app

	const container = Div( [ 'dx-container', 'container-fluid', 'mb-4 vstack', 'gap-3' ] )
	page.before( container )
	container.show = () => container.style.display = ''
	container.hide = () => container.style.display = 'none'

	return {
		info( title, msg ) {
			const alert = Alert( title, msg, { type: 'info' } )
			container.append( alert )
			container.show()
			return alert
		},
		warning( title, msg ) {
			const alert = Alert( title, msg, { type: 'warning' } )
			container.append( alert )
			container.show()
			return alert
		},
		error( title, msg ) {
			const alert = Alert( title, msg, { type: 'danger' } )
			container.append( alert )
			container.show()
			return alert
		},
		reset() {
			container.hide()
			container.innerHTML = ''
		},
	}
}
