default: release upload

release:
	bumpversion patch

upload: release
	echo
