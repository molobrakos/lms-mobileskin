REPO=$(notdir $(PWD))

GITHUB_USER=molobrakos
GITHUB_REPO="$(GITHUB_USER)/$(REPO)"

ZIP=zip -9r --symlinks
BUMPVERSION_CFG=.bumpversion.cfg
VERSION=$(shell grep current_version $(BUMPVERSION_CFG) | cut -d "=" -f 2 | xargs)

SRC=$(wildcard m/*.html m/*.css m/*.js m/*.json)

ASSET=release-$(VERSION).zip

.PHONY: default upload release

default: zip

bumpversion:
	bumpversion patch

$(ASSET): $(SRC) $(BUMPVERSION_CFG)
	@$(ZIP) $@ $^

asset: $(ASSET)

release: asset
	github-release $(GITHUB_REPO) create --publish $(VERSION) $(ASSET)

clean:
	echo
