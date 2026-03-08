Hooks.once('init', () => {
	if (typeof Babele !== 'undefined') {
		Babele.get().register({
			module: 'dnd6e',
			lang: 'pt-BR',
			dir: 'babele'
		});
	}
});
