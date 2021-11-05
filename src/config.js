const msalConfig = {
	auth: {
		clientId: '',
		authority: '',
		redirectUri: 'http://localhost:8080',
	},
}

const msalRequest = {
	scopes: [
		'user.read',
		'files.read',
		'files.readwrite',
	],
}

const onedriveConfig = {
	drive: 'REDACTED',
	defaultSelect: 'id,name,parentReference,folder,lastModifiedDateTime,size',
	defaultChildrenSelect: 'id,name,folder,file,lastModifiedDateTime,size',
	defaultLimit: 1000000, // A high number ensures the max == max allowed. Currently, max == 5000.
	defaultTimeout: 60 * 1000, // Time in ms
}

export { msalConfig, msalRequest, onedriveConfig }
