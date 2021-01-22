/**
 * External dependencies
 */
import { Text, TouchableWithoutFeedback, Linking, Alert } from 'react-native';

/**
 * WordPress dependencies
 */
import { View } from '@wordpress/primitives';
import { Icon } from '@wordpress/components';
import { withPreferredColorScheme } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { audio, warning } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import styles from './styles.scss';

function Player( {
	getStylesFromColorScheme,
	source,
	isUploadInProgress,
	fileName,
	isUploadFailed,
} ) {
	const onPressListen = () => {
		if ( source ) {
			Linking.canOpenURL( source )
				.then( ( supported ) => {
					if ( ! supported ) {
						Alert.alert(
							__( 'Problem opening the audio' ),
							__( 'No application can handle this request.' )
						);
					} else {
						return Linking.openURL( source );
					}
				} )
				.catch( () => {
					Alert.alert(
						__( 'Problem opening the audio' ),
						__( 'An unknown error occurred. Please try again.' )
					);
				} );
		}
	};

	const containerStyle = getStylesFromColorScheme(
		styles.container,
		styles.containerDark
	);

	const iconStyle = getStylesFromColorScheme( styles.icon, styles.iconDark );

	const iconDisabledStyle = getStylesFromColorScheme(
		styles.iconDisabled,
		styles.iconDisabledDark
	);

	const isDisabled = isUploadFailed || isUploadInProgress;

	const finalIconStyle = {
		...iconStyle,
		...( isDisabled && iconDisabledStyle ),
	};

	const iconContainerStyle = getStylesFromColorScheme(
		styles.iconContainer,
		styles.iconContainerDark
	);

	const titleStyle = getStylesFromColorScheme(
		styles.title,
		styles.titleDark
	);

	const uploadFailedStyle = getStylesFromColorScheme(
		styles.uploadFailed,
		styles.uploadFailedDark
	);

	const subtitleStyle = getStylesFromColorScheme(
		styles.subtitle,
		styles.subtitleDark
	);

	const finalSubtitleStyle = {
		...subtitleStyle,
		...( isUploadFailed && uploadFailedStyle ),
	};

	let title = '';
	let extension = '';

	if ( fileName ) {
		const parts = fileName.split( '.' );
		extension = parts.pop().toUpperCase();
		title = parts.join( '.' );
	}

	const getSubtitleValue = () => {
		if ( isUploadInProgress ) {
			return __( 'Uploading…' );
		}
		if ( isUploadFailed ) {
			return __( 'Failed to insert audio file. Please tap for options.' );
		}
		return (
			extension +
			// translators: displays audio file extension. e.g. MP3 audio file
			__( ' audio file' )
		);
	};

	return (
		<View style={ containerStyle }>
			<View style={ iconContainerStyle }>
				<Icon icon={ audio } style={ finalIconStyle } size={ 24 } />
			</View>
			<View style={ styles.titleContainer }>
				<Text style={ titleStyle }>{ title }</Text>
				<View style={ styles.subtitleContainer }>
					{ isUploadFailed && (
						<Icon
							icon={ warning }
							style={ {
								...styles.errorIcon,
								...uploadFailedStyle,
							} }
							size={ 16 }
						/>
					) }
					<Text style={ finalSubtitleStyle }>
						{ getSubtitleValue() }
					</Text>
				</View>
			</View>
			{ ! isDisabled && (
				<TouchableWithoutFeedback
					accessibilityLabel={ __( 'Audio Player' ) }
					accessibilityRole={ 'button' }
					accessibilityHint={ __(
						'Double tap to listen the audio file'
					) }
					onPress={ onPressListen }
				>
					<Text style={ styles.buttonText }>{ __( 'Listen' ) }</Text>
				</TouchableWithoutFeedback>
			) }
		</View>
	);
}

export default withPreferredColorScheme( Player );
