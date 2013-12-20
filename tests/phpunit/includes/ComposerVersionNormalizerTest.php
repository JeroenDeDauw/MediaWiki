<?php

/**
 * @covers ComposerVersionNormalizer
 *
 * @group ComposerJsonUpdater
 *
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class ComposerVersionNormalizerTest extends PHPUnit_Framework_TestCase {

	/**
	 * @dataProvider nonStringProvider
	 */
	public function testGivenNonString_normalizeThrowsInvalidArgumentException( $nonString ) {
		$normalizer = new ComposerVersionNormalizer();

		$this->setExpectedException( 'InvalidArgumentException' );
		$normalizer->normalize( $nonString );
	}

	public function nonStringProvider() {
		return array(
			array( null ),
			array( 42 ),
			array( array() ),
			array( new stdClass() ),
			array( true ),
		);
	}

	/**
	 * @dataProvider simpleVersionProvider
	 */
	public function testGivenSimpleVersion_normalizeReturnsAsIs( $simpleVersion ) {
		$this->assertRemainsUnchanged( $simpleVersion );
	}

	protected function assertRemainsUnchanged( $version ) {
		$normalizer = new ComposerVersionNormalizer();

		$this->assertEquals(
			$version,
			$normalizer->normalize( $version )
		);
	}

	public function simpleVersionProvider() {
		return array(
			array( '1.22.0' ),
			array( '1.19.2' ),
			array( '1.9' ),
		);
	}

	/**
	 * @dataProvider complexVersionProvider
	 */
	public function testGivenComplexVersionWithoutDash_normalizeAddsDash( $withoutDash, $withDash ) {
		$normalizer = new ComposerVersionNormalizer();

		$this->assertEquals(
			$withDash,
			$normalizer->normalize( $withoutDash )
		);
	}

	public function complexVersionProvider() {
		return array(
			array( '1.22.0alpha', '1.22.0-alpha' ),
			array( '1.22.0RC', '1.22.0-RC' ),
			array( '1.19beta', '1.19-beta' ),
			array( '1.9RC4', '1.9-RC4' ),
		);
	}

	/**
	 * @dataProvider complexVersionProvider
	 */
	public function testGivenComplexVersionWithDash_normalizeReturnsAsIs( $withoutDash, $withDash ) {
		$this->assertRemainsUnchanged( $withDash );
	}

}