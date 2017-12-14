REPO=$(notdir $(PWD))

GITHUB_USER=molobrakos
GITHUB_REPO="$(GITHUB_USER)/$(REPO)"

ZIP=zip -9r --symlinks
BUMPVERSION_CFG=.bumpversion.cfg
VERSION=$(shell grep current_version $(BUMPVERSION_CFG) | cut -d "=" -f 2 | xargs)
ASSET=release-$(VERSION).zip
SHA=$(shell sha1sum -b $(ASSET) | cut -d " " -f 1)
SRC=install.xml Plugin.pm HTML

.PHONY: default upload release

default:
	@echo "Use make release to release"

bumpversion:
	bumpversion patch

$(ASSET): $(SRC)
	@$(ZIP) $@ $^

asset: $(ASSET) $(BUMPVERSION_CFG)
	sed -i "s/<sha>.*<\/sha>/<sha>$(SHA)<\/sha>/" public.xml
	git commit -m "Updated SHA1" public.xml

release-it: asset
	git push
	github-release $(GITHUB_REPO) create --publish $(VERSION) $(ASSET)

release: bumpversion
	make release-it

clean:
	echo
