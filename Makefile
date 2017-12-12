GITHUB_USER=molobrakos
GITHUB_TOKEN=$(shell cat $(HOME)/.github.token)
GITHUB_REPO=$(notdir $(PWD))
GITHUB_CREDENTIALS=$(GITHUB_USER):$(GITHUB_TOKEN)
GITHUB_URL_RELEASE=https://api.github.com/repos/$(GITHUB_USER)/$(GITHUB_REPO)/releases
ZIP=zip -9r --symlinks
VERSION=$(shell grep current_version .bumpversion.cfg | cut -d "=" -f 2 | xargs)

.PHONY: default tag release zip upload

default: release.zip

tag:
	echo
	bumpversion patch

release: tag
	echo $(VERSION)
	curl --user $(GITHUB_CREDENTIALS) \
		-X POST $(GITHUB_URL_RELEASE) \
		-d "\
		{\
		\"tag_name\": \"v$(VERSION)\"\
		}"

release.zip: release
	@$(ZIP) $@ m/*html m/*.css m/*.js m/*.json

upload: release.zip
