REPO=$(notdir $(PWD))

GITHUB_USER=molobrakos
GITHUB_REPO="$(GITHUB_USER)/$(REPO)"

ZIP=zip -9r --symlinks
BUMPVERSION_CFG=.bumpversion.cfg
VERSION=$(shell grep current_version $(BUMPVERSION_CFG) | cut -d "=" -f 2 | xargs)
ASSET=release-$(VERSION).zip
SHA=$(shell sha1sum -b $(ASSET) | cut -d " " -f 1)
SRC=$(wildcard m/*.html m/*.css m/*.js m/*.json)

.PHONY: default upload release

default: release

bumpversion:
	bumpversion patch

$(ASSET): $(SRC)
	@$(ZIP) $@ $^

asset: $(ASSET) $(BUMPVERSION_CFG)
	sed -i "s/<sha>.*<\/sha>/<sha>$(SHA)<\/sha>/" public.xml
	git commit -m "Updated SHA1" public.xml

release: asset
	github-release $(GITHUB_REPO) create --publish $(VERSION) $(ASSET)

clean:
	echo
