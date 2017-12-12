default: release upload

release:
        bumpversion patch
        #mkdir -p dist
        #zip -9y dist/foo.zip m/*.{html,css,js,json}
        # FIXME: minify etc

upload:
        echo
#	scp
