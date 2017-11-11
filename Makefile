# FIXME: minify etc

release:
	bumpversion patch
	mkdir -p dist
	zip -9y dist/foo.zip m/*.{html,css,js,json}
