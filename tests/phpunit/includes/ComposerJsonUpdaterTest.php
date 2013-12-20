<?php

/**
 * @covers ComposerJsonUpdater
 *
 * @group ComposerJsonUpdater
 *
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class ComposerJsonUpdaterTest extends PHPUnit_Framework_TestCase {

	public function testCanLoad() {
		$this->assertTrue( class_exists( 'ComposerJsonUpdater' ) );
	}

	/**
	 * @dataProvider mediawikiVersionProvider
	 */
	public function testUpdateMediaWikiVersion( $mwVersion ) {
		$composerFile = $this->getMock( 'ComposerFile' );

		$composerFile->expects( $this->once() )
			->method( 'readPackageDefinition' )
			->will( $this->returnValue(
				array(
					'require' => array(
						'php' => '>=5.3.2',
						'mediawiki/sub-page-list' => '~1.1',
					)
				)
			) );

		$composerFile->expects( $this->once() )
			->method( 'writePackageDefinition' )
			->with( $this->equalTo(
				array(
					'require' => array(
						'php' => '>=5.3.2',
						'mediawiki/sub-page-list' => '~1.1',
					),
					'provide' => array(
						'mediawiki/mediawiki' => $this->tweakVersion( $mwVersion )
					)
				)
			) );

		$versionNormalizer = $this->getMock( 'ComposerVersionNormalizer' );

		$versionNormalizer->expects( $this->any() )
			->method( 'normalize' )
			->will( $this->returnCallback( array( $this, 'tweakVersion' ) ) );

		$updater = new ComposerJsonUpdater( $composerFile, $versionNormalizer );

		$updater->updateMediaWikiVersion( $mwVersion );
	}

	public function mediawikiVersionProvider() {
		return array(
			array( '1.22.0' ),
			array( '1.19.2' ),
			array( '1.19.0-RC' ),
			array( '1.19.0-alpha' ),
			array( '1.19.0-beta2' ),
			array( '1.19.0-RC42' ),
		);
	}

	public function tweakVersion( $version ) {
		return '|' . $version . '|';
	}

}