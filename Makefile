defalt: zip

tag:
	bumpversion patch

release: tag
	echo

zip: release.zip
	zip -9r --symlinks $@ m/*html m/*.css m/*.js m/*.json

upload: zip
	echo
