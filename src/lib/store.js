export const store = {
	set( key, value ) {
		sessionStorage.setItem( key, JSON.stringify( value ) )
	},

	get( key ) {
		const value = sessionStorage.getItem( key )
		return value !== undefined ? JSON.parse( value ) : undefined
	},

	delete( key ) {
		sessionStorage.removeItem( key )
	},

	raw( key ) {
		return sessionStorage.getItem( key )
	},
}
