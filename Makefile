run:
	@ZELLIJ_BIN="$(HOME)/.local/bin/zellij" \
	ZJ_PANES="$$($(HOME)/.local/bin/zellij action query-panes --json 2>/dev/null)" \
	$(HOME)/.local/bin/zellij --layout zellij.layout.kdl
