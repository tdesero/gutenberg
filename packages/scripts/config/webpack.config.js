/**
 * External dependencies
 */
const { BundleAnalyzerPlugin } = require( 'webpack-bundle-analyzer' );
const { CleanWebpackPlugin } = require( 'clean-webpack-plugin' );
const browserslist = require( 'browserslist' );
const fs = require( 'fs' );
const MiniCSSExtractPlugin = require( 'mini-css-extract-plugin' );
const path = require( 'path' );
const ReactRefreshWebpackPlugin = require( '@pmmmwh/react-refresh-webpack-plugin' );
const TerserPlugin = require( 'terser-webpack-plugin' );

/**
 * WordPress dependencies
 */
const DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );
const postcssPlugins = require( '@wordpress/postcss-plugins-preset' );

/**
 * Internal dependencies
 */
const {
	fromConfigRoot,
	hasBabelConfig,
	hasCssnanoConfig,
	hasPostCSSConfig,
} = require( '../utils' );

const DEV_SERVER_PORT = 8887;
const isProduction = process.env.NODE_ENV === 'production';
const mode = isProduction ? 'production' : 'development';
let target = 'browserslist';
if ( ! browserslist.findConfig( '.' ) ) {
	target += ':' + fromConfigRoot( '.browserslistrc' );
}
let entry = {};
if ( process.env.WP_ENTRY ) {
	entry = JSON.parse( process.env.WP_ENTRY );
} else {
	// By default the script checks if `src/index.js` exists and sets it as an entry point.
	// In the future we should add similar handling for `src/script.js` and `src/view.js`.
	[ 'index' ].forEach( ( entryName ) => {
		const filepath = path.resolve(
			process.cwd(),
			'src',
			`${ entryName }.js`
		);
		if ( fs.existsSync( filepath ) ) {
			entry[ entryName ] = filepath;
		}
	} );
}

const cssLoaders = [
	{
		loader: MiniCSSExtractPlugin.loader,
	},
	{
		loader: require.resolve( 'css-loader' ),
		options: {
			sourceMap: ! isProduction,
			modules: {
				auto: true,
			},
		},
	},
	{
		loader: require.resolve( 'postcss-loader' ),
		options: {
			// Provide a fallback configuration if there's not
			// one explicitly available in the project.
			...( ! hasPostCSSConfig() && {
				postcssOptions: {
					ident: 'postcss',
					sourceMap: ! isProduction,
					plugins: isProduction
						? [
								...postcssPlugins,
								require( 'cssnano' )( {
									// Provide a fallback configuration if there's not
									// one explicitly available in the project.
									...( ! hasCssnanoConfig() && {
										preset: [
											'default',
											{
												discardComments: {
													removeAll: true,
												},
											},
										],
									} ),
								} ),
						  ]
						: postcssPlugins,
				},
			} ),
		},
	},
];

const config = {
	mode,
	target,
	entry,
	output: {
		filename: '[name].js',
		path: path.resolve( process.cwd(), 'build' ),
		publicPath: `//127.0.0.1:${ DEV_SERVER_PORT }/build/`,
	},
	resolve: {
		alias: {
			'lodash-es': 'lodash',
		},
	},
	optimization: {
		// Only concatenate modules in production, when not analyzing bundles.
		concatenateModules: isProduction && ! process.env.WP_BUNDLE_ANALYZER,
		splitChunks: {
			cacheGroups: {
				style: {
					type: 'css/mini-extract',
					test: /[\\/]style(\.module)?\.(sc|sa|c)ss$/,
					chunks: 'all',
					enforce: true,
					name( module, chunks, cacheGroupKey ) {
						return `${ cacheGroupKey }-${ chunks[ 0 ].name }`;
					},
				},
				default: false,
			},
		},
		minimizer: [
			new TerserPlugin( {
				parallel: true,
				terserOptions: {
					output: {
						comments: /translators:/i,
					},
					compress: {
						passes: 2,
					},
					mangle: {
						reserved: [ '__', '_n', '_nx', '_x' ],
					},
				},
				extractComments: false,
			} ),
		],
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: require.resolve( 'babel-loader' ),
						options: {
							// Babel uses a directory within local node_modules
							// by default. Use the environment variable option
							// to enable more persistent caching.
							cacheDirectory:
								process.env.BABEL_CACHE_DIRECTORY || true,

							// Provide a fallback configuration if there's not
							// one explicitly available in the project.
							...( ! hasBabelConfig() && {
								babelrc: false,
								configFile: false,
								presets: [
									require.resolve(
										'@wordpress/babel-preset-default'
									),
								],
								plugins: [
									! isProduction &&
										require.resolve(
											'react-refresh/babel'
										),
								].filter( Boolean ),
							} ),
						},
					},
				],
			},
			{
				test: /\.css$/,
				use: cssLoaders,
			},
			{
				test: /\.(sc|sa)ss$/,
				use: [
					...cssLoaders,
					{
						loader: require.resolve( 'sass-loader' ),
						options: {
							sourceMap: ! isProduction,
						},
					},
				],
			},
			{
				test: /\.svg$/,
				issuer: /\.jsx?$/,
				use: [ '@svgr/webpack', 'url-loader' ],
				type: 'javascript/auto',
			},
			{
				test: /\.svg$/,
				issuer: /\.(sc|sa|c)ss$/,
				type: 'asset/inline',
			},
			{
				test: /\.(bmp|png|jpe?g|gif)$/i,
				type: 'asset/resource',
				generator: {
					filename: 'images/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: 'asset/resource',
				generator: {
					filename: 'fonts/[name].[hash:8][ext]',
				},
			},
		],
	},
	plugins: [
		// During rebuilds, all webpack assets that are not used anymore will be
		// removed automatically. There is an exception added in watch mode for
		// fonts and images. It is a known limitations:
		// https://github.com/johnagan/clean-webpack-plugin/issues/159
		new CleanWebpackPlugin( {
			cleanAfterEveryBuildPatterns: [ '!fonts/**', '!images/**' ],
		} ),
		// The WP_BUNDLE_ANALYZER global variable enables a utility that represents
		// bundle content as a convenient interactive zoomable treemap.
		process.env.WP_BUNDLE_ANALYZER && new BundleAnalyzerPlugin(),
		// MiniCSSExtractPlugin to extract the CSS thats gets imported into JavaScript.
		new MiniCSSExtractPlugin( { filename: '[name].css' } ),
		// React Fast Refresh.
		! isProduction &&
			new ReactRefreshWebpackPlugin( {
				overlay: {
					sockPort: DEV_SERVER_PORT,
				},
			} ),
		// WP_NO_EXTERNALS global variable controls whether scripts' assets get
		// generated, and the default externals set.
		! process.env.WP_NO_EXTERNALS &&
			new DependencyExtractionWebpackPlugin(),
	].filter( Boolean ),
	stats: {
		children: false,
	},
};

if ( ! isProduction ) {
	// WP_DEVTOOL global variable controls how source maps are generated.
	// See: https://webpack.js.org/configuration/devtool/#devtool.
	config.devtool = process.env.WP_DEVTOOL || 'source-map';
	config.module.rules.unshift( {
		test: /\.js$/,
		exclude: [ /node_modules/ ],
		use: require.resolve( 'source-map-loader' ),
		enforce: 'pre',
	} );
	config.devServer = {
		headers: {
			// Requests come from the WP port.
			'Access-Control-Allow-Origin': '*',
		},
		liveReload: false,
		port: DEV_SERVER_PORT,
		devMiddleware: {
			writeToDisk: true,
		},
	};
}

module.exports = config;
