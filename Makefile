test:
	./node_modules/.bin/mocha ${ARGS} --reporter spec

.PHONY: test
