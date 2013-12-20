<?php

/**
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class ComposerVersionNormalizer {

	public function normalize( $version ) {
		if ( !is_string( $version ) ) {
			throw new InvalidArgumentException( '$version must be a string' );
		}

		return preg_replace( '/(\.\d+)([a-zA-Z]+)/', '$1-$2', $version, 1 );
	}

}