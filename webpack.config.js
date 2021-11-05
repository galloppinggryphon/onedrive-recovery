// const path = require( 'path' )
import * as path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'

// "datatables.net": "^1.11.3",
// "datatables.net-bs5": "^1.11.3",
// "datatables.net-select": "^1.3.3",
// "datatables.net-select-bs5": "^1.3.3",

export default {
	mode: 'development',
	entry: './src/main.js',
	output: {
		filename: 'main.js',
		path: path.resolve( '.', 'web' ),
		clean: true,
		// chunkFormat: 'module',
	},
	devtool: 'inline-source-map',
	plugins: [

		new HtmlWebpackPlugin( {
			title: 'Output Management',
			template: 'src/web/index.html',
			scriptLoading: 'module',
		} ),

		new CopyPlugin( {
			patterns: [
				{
					context: path.resolve( '.', 'src', 'web' ),
					from: '**/*',
					to: '',
					globOptions: {
						dot: true,
						gitignore: true,
						ignore: [ '**/index.html' ],
					},
				},
			],
		} ),

	],
	module: {
		rules: [
			{
				test: /\.css/i,
				// type: 'asset/resource',
				use: [ 'style-loader', 'css-loader' ],
			},
		],
	},
}
