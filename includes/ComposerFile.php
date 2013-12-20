<?php

/**
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class ComposerFile {

	protected $fileName;

	public function __construct() {
		$this->fileName = __DIR__ . '/../composer.json';
	}

	public function readPackageDefinition() {
		return json_decode( file_get_contents( $this->fileName ), true );
	}

	public function writePackageDefinition( $definition ) {
		file_put_contents( $this->fileName, json_encode( $definition ) );
	}

}