<?php

/**
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class ComposerJsonUpdater {

	private $composerFile;
	private $versionNormalizer;

	public function __construct( ComposerFile $composerFile, ComposerVersionNormalizer $versionNormalizer ) {
		$this->composerFile = $composerFile;
		$this->versionNormalizer = $versionNormalizer;
	}

	public function updateMediaWikiVersion( $mwVersion ) {
		$package = $this->composerFile->readPackageDefinition();

		$package = array_merge(
			$package,
			array(
				'provide' => array(
					'mediawiki/mediawiki' => $this->versionNormalizer->normalize( $mwVersion )
				)
			)
		);

		$this->composerFile->writePackageDefinition( $package );
	}

}
