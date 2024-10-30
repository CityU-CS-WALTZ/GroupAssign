declare function acquireVsCodeApi(): any;

declare var settings: GitGraphViewSettings;

declare interface Point {
	x: number;
	y: number;
}

declare interface Line {
	p1: Point;
	p2: Point;
	isCommitted: boolean;
}

declare interface Config {
	grid: { x: number, y: number, offsetX: number, offsetY: number };
	colours: string[];
	graphStyle: 'rounded' | 'angular';
	initialLoadCommits: number;
	loadMoreCommits: number;
}

(function () {
	const vscode = acquireVsCodeApi();
	const svgIcons = {
		branch: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16"><path fill-rule="evenodd" d="M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"/></svg>',
		tag: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="0 0 15 16"><path fill-rule="evenodd" d="M7.73 1.73C7.26 1.26 6.62 1 5.96 1H3.5C2.13 1 1 2.13 1 3.5v2.47c0 .66.27 1.3.73 1.77l6.06 6.06c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41L7.73 1.73zM2.38 7.09c-.31-.3-.47-.7-.47-1.13V3.5c0-.88.72-1.59 1.59-1.59h2.47c.42 0 .83.16 1.13.47l6.14 6.13-4.73 4.73-6.13-6.15zM3.01 3h2v2H3V3h.01z"/></svg>',
		loading: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M10.24 7.4a4.15 4.15 0 0 1-1.2 3.6 4.346 4.346 0 0 1-5.41.54L4.8 10.4.5 9.8l.6 4.2 1.31-1.26c2.36 1.74 5.7 1.57 7.84-.54a5.876 5.876 0 0 0 1.74-4.46l-1.75-.34zM2.96 5a4.346 4.346 0 0 1 5.41-.54L7.2 5.6l4.3.6-.6-4.2-1.31 1.26c-2.36-1.74-5.7-1.57-7.85.54C.5 5.03-.06 6.65.01 8.26l1.75.35A4.17 4.17 0 0 1 2.96 5z"/></svg>'
	};
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const htmlEscapes: { [key: string]: string } = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		'\'': '&#x27;',
		'/': '&#x2F;'
	};
	const htmlEscaper = /[&<>"'\/]/g;

	class Branch {
		private nodes: Node[];
		private lines: Line[];
		private colour: number;
		private end: number;

		constructor(colour: number) {
			this.nodes = [];
			this.lines = [];
			this.colour = colour;
			this.end = 0;
		}

		public addNode(node: Node) {
			if (node.hasParents()) {
				let joinsToNode = node.getNextParent();
				if (joinsToNode !== null) {
					let joinsToNodePos = joinsToNode.getPoint();
					this.addLine(node.getPoint(), joinsToNodePos, node.getIsCommitted());
					node.registerParentProcessed();
					this.end = joinsToNodePos.y;
				}
			}
			this.nodes.push(node);
			node.addToBranch(this);
		}
		public addLine(p1: Point, p2: Point, isCommitted: boolean) {
			this.lines.push({ p1: p1, p2: p2, isCommitted: isCommitted });
		}
		public isMergeOnly() {
			return this.nodes.length === 1 && this.nodes[0].isMerge() && !this.nodes[0].isOnThisBranch(this);
		}
		public simplifyMergeOnly() {
			let lastParent = this.nodes[0].getLastParent();
			if (lastParent === null) return;

			let connectsToBranch = lastParent.getBranch();
			if (connectsToBranch !== null) {
				connectsToBranch.addLine(this.lines[0].p1, this.lines[0].p2, this.nodes[0].getIsCommitted());
			}
		}
		public getColour() {
			return this.colour;
		}
		public getEnd() {
			return this.end;
		}
		public setEnd(end: number) {
			this.end = end;
		}
		public draw(svg: SVGElement, config: Config) {
			let colour = config.colours[this.colour % config.colours.length], i;
			for (i = 0; i < this.lines.length; i++) {
				this.drawLine(svg, this.lines[i].p1.x * config.grid.x + config.grid.offsetX, this.lines[i].p1.y * config.grid.y + config.grid.offsetY, this.lines[i].p2.x * config.grid.x + config.grid.offsetX, this.lines[i].p2.y * config.grid.y + config.grid.offsetY, this.lines[i].isCommitted ? colour : '#808080', config);
			}
		}
		private drawLine(svg: SVGElement, x1: number, y1: number, x2: number, y2: number, colour: string, config: Config) {
			let line = document.createElementNS('http://www.w3.org/2000/svg', 'path'), path;
			if (x1 === x2) {
				path = 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2;
			} else {
				if (config.graphStyle === 'angular') {
					path = 'M ' + x1 + ' ' + y1 + ' L ' + (x1 < x2 ? (x2 + ' ' + (y1 + config.grid.offsetY)) : (x1 + ' ' + (y2 - config.grid.offsetY))) + ' L ' + x2 + ' ' + y2;
				} else {
					if (x1 < x2) {
						path = 'M ' + x1 + ' ' + y1 + ' Q ' + x1 + ' ' + (y1 + config.grid.offsetY) + ' ' + (x1 + config.grid.offsetX) + ' ' + (y1 + config.grid.offsetY) + ' L ' + (x2 - config.grid.offsetX) + ' ' + (y1 + config.grid.offsetY) + ' Q ' + (x2) + ' ' + (y1 + config.grid.offsetY) + ' ' + x2 + ' ' + (y1 + config.grid.y) + ' L ' + x2 + ' ' + y2;
					} else {
						path = 'M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + (y2 - config.grid.y) + ' Q ' + x1 + ' ' + (y2 - config.grid.offsetY) + ' ' + (x1 - config.grid.offsetX) + ' ' + (y2 - config.grid.offsetY) + ' L ' + (x2 + config.grid.offsetX) + ' ' + (y2 - config.grid.offsetY) + ' Q ' + x2 + ' ' + (y2 - config.grid.offsetY) + ' ' + x2 + ' ' + y2;
					}

				}
			}
			line.setAttribute('d', path);
			line.setAttribute('fill', 'none');
			line.setAttribute('stroke', colour);
			line.setAttribute('stroke-width', '2');
			svg.appendChild(line);
		}
	}

	class Node {
		private x: number;
		private y: number;
		private parents: Node[];
		private nextParent: number;
		private onBranch: Branch | null;
		private isCommitted: boolean;

		constructor(y: number, isCommitted: boolean) {
			this.x = 0;
			this.y = y;
			this.parents = [];
			this.nextParent = 0;
			this.onBranch = null;
			this.isCommitted = isCommitted;
		}

		public addParent(node: Node) {
			this.parents.push(node);
		}
		public hasParents() {
			return this.parents.length > 0;
		}
		public getNextParent(): Node | null {
			if (this.nextParent < this.parents.length) return this.parents[this.nextParent];
			return null;
		}
		public getLastParent(): Node | null {
			if (this.nextParent < 1) return null;
			return this.parents[this.nextParent - 1];
		}
		public registerParentProcessed() {
			this.nextParent++;
		}
		public isMerge() {
			return this.parents.length > 1;
		}

		public addToBranch(branch: Branch) {
			if (this.onBranch === null) this.onBranch = branch;
		}
		public isNotOnBranch() {
			return this.onBranch === null;
		}
		public isOnThisBranch(branch: Branch) {
			return this.onBranch === branch;
		}
		public getBranch() {
			return this.onBranch;
		}

		public pushRight() {
			if (this.onBranch === null) this.x++;
		}
		public getIsCommitted() {
			return this.isCommitted;
		}
		public getPoint(): Point {
			return { x: this.x, y: this.y };
		}

		public draw(svg: SVGElement, config: Config) {
			let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			let colour = this.isCommitted ? config.colours[this.onBranch!.getColour() % config.colours.length] : '#808080';
			circle.setAttribute('cx', (this.x * config.grid.x + config.grid.offsetX).toString());
			circle.setAttribute('cy', (this.y * config.grid.y + config.grid.offsetY).toString());
			circle.setAttribute('r', '4');
			if(this.y > 0){
				circle.setAttribute('fill', colour);
			}else{
				circle.setAttribute('class', 'first');
				circle.setAttribute('stroke', colour);
			}
			
			svg.appendChild(circle);
		}
	}

	class GitGraph {
		private branchOptions: string[];
		private commits: GitCommitNode[];
		private selectedBranch: string | null;
		private maxCommits: number;
		private moreCommitsAvailable: boolean;
		private showRemoteBranches: boolean;

		private config: Config;
		private nodes: Node[];
		private branches: Branch[];
		private availableColours: number[];
		private graphElem: HTMLElement;
		private tableElem: HTMLElement;
		private branchSelectElem: HTMLSelectElement;
		private showRemoteBranchesElem: HTMLInputElement;

		constructor(config: Config, previousState: any) {
			this.branchOptions = [];
			this.commits = [];
			this.selectedBranch = null;
			this.maxCommits = config.initialLoadCommits;
			this.moreCommitsAvailable = false;
			this.showRemoteBranches = true;

			this.config = config;
			this.nodes = [];
			this.branches = [];
			this.availableColours = [];
			this.graphElem = document.getElementById('commitGraph')!;
			this.tableElem = document.getElementById('commitTable')!;
			this.branchSelectElem = <HTMLSelectElement>document.getElementById('branchSelect')!;
			this.showRemoteBranchesElem = <HTMLInputElement>document.getElementById('showRemoteBranchesCheckbox')!;

			this.branchSelectElem.addEventListener('change', () => {
				this.selectedBranch = this.branchSelectElem.value;
				this.maxCommits = this.config.initialLoadCommits;
				this.saveState();
				this.showLoading();
				this.requestLoadCommits();
			});
			this.showRemoteBranchesElem.addEventListener('change', () => {
				this.showRemoteBranches = this.showRemoteBranchesElem.checked;
				this.saveState();
				this.showLoading();
				this.requestLoadBranchOptions();
			});
			document.getElementById('refreshBtn')!.addEventListener('click', () => {
				this.showLoading();
				this.requestLoadBranchOptions();
			});

			this.showLoading();
			if (previousState) {
				if (typeof previousState.selectedBranch !== 'undefined') {
					this.selectedBranch = previousState.selectedBranch;
				}
				if (typeof previousState.showRemoteBranches !== 'undefined') {
					this.showRemoteBranches = previousState.showRemoteBranches;
					this.showRemoteBranchesElem.checked = this.showRemoteBranches;
				}
				if (typeof previousState.maxCommits !== 'undefined') {
					this.maxCommits = previousState.maxCommits;
				}
				if (typeof previousState.commits !== 'undefined') {
					this.loadCommits(previousState.commits, previousState.moreCommitsAvailable);
				}
				if (typeof previousState.branchOptions !== 'undefined') {
					this.loadBranchOptions(previousState.branchOptions);
				}
			}
			this.requestLoadBranchOptions();
		}

		public loadBranchOptions(branchOptions: string[]) {
			this.branchOptions = branchOptions;
			if (this.selectedBranch !== null && this.branchOptions.indexOf(this.selectedBranch) === -1) this.selectedBranch = '';
			this.saveState();

			let html = '<option' + (this.selectedBranch === null || this.selectedBranch === '' ? ' selected' : '') + ' value="">Show All</option>';
			for (let i = 0; i < this.branchOptions.length; i++) {
				html += '<option value="' + this.branchOptions[i] + '"' + (this.selectedBranch === this.branchOptions[i] ? ' selected' : '') + '>' + (this.branchOptions[i].indexOf('remotes/') === 0 ? this.branchOptions[i].substring(8) : this.branchOptions[i]) + '</option>';
			}
			this.branchSelectElem.innerHTML = html;
			this.requestLoadCommits();
		}

		public loadCommits(commits: GitCommitNode[], moreAvailable: boolean) {
			this.moreCommitsAvailable = moreAvailable;
			this.commits = commits;
			this.saveState();

			this.nodes = [];
			this.branches = [];
			this.availableColours = [];

			let i: number, j: number;
			for (i = 0; i < this.commits.length; i++) {
				this.nodes.push(new Node(i, this.commits[i].hash !== '*'));
			}
			for (i = 0; i < this.commits.length; i++) {
				for (j = 0; j < this.commits[i].parents.length; j++) {
					this.nodes[i].addParent(this.nodes[this.commits[i].parents[j]]);
				}
			}

			while ((i = this.findStart()) !== -1) {
				this.determinePath(i);
			}

			this.render();
		}

		private requestLoadBranchOptions() {
			sendMessage({ command: 'loadBranches', data: { showRemoteBranches: this.showRemoteBranches } });
		}

		private requestLoadCommits() {
			sendMessage({ command: 'loadCommits', data: { branch: (this.selectedBranch !== null ? this.selectedBranch : ''), maxCommits: this.maxCommits, showRemoteBranches: this.showRemoteBranches } });
		}

		private saveState() {
			vscode.setState({
				branchOptions: this.branchOptions,
				commits: this.commits,
				selectedBranch: this.selectedBranch,
				maxCommits: this.maxCommits,
				showRemoteBranches: this.showRemoteBranches
			});
		}

		private determinePath(startAt: number) {
			let i = startAt, j, joinsToNode, joinsToNodePoint, branch = new Branch(this.getAvailableColour(startAt));
			while ((joinsToNode = this.nodes[i].getNextParent()) !== null) {
				joinsToNodePoint = joinsToNode.getPoint();
				branch.addNode(this.nodes[i]);
				for (j = i + 1; j < joinsToNodePoint.y; j++) {
					if (this.nodes[j].isNotOnBranch()) this.nodes[j].pushRight();
				}
				i = joinsToNodePoint.y;
				if(!joinsToNode.isNotOnBranch()) break;
			}
			if (this.nodes[i].isNotOnBranch() && !this.nodes[i].hasParents()) {
				branch.addNode(this.nodes[i]);
				branch.setEnd(this.nodes.length);
				if (i !== this.nodes.length) {
					let nodePoint = this.nodes[i].getPoint();
					branch.addLine(nodePoint, { x: nodePoint.x, y: this.nodes.length - 1 }, this.commits[i].hash !== '*');
					for (j = i + 1; j < this.nodes.length; j++) {
						if (this.nodes[j].isNotOnBranch()) this.nodes[j].pushRight();
					}
				}
			}

			if (branch.isMergeOnly()) {
				branch.simplifyMergeOnly();
			} else {
				this.branches.push(branch);
				this.availableColours[branch.getColour()] = branch.getEnd();
			}
		}
		private findStart() {
			for (let i = 0; i < this.nodes.length; i++) {
				if (this.nodes[i].getNextParent() !== null || this.nodes[i].isNotOnBranch()) return i;
			}
			return -1;
		}
		private getAvailableColour(startAt: number) {
			for (let i = 0; i < this.availableColours.length; i++) {
				if (startAt > this.availableColours[i]) {
					return i;
				}
			}
			this.availableColours.push(0);
			return this.availableColours.length - 1;
		}
		private getWidth() {
			let x = 0, i, p;
			for (i = 0; i < this.nodes.length; i++) {
				p = this.nodes[i].getPoint();
				if (p.x > x) x = p.x;
			}
			return (x + 1) * this.config.grid.x;
		}
		private getHeight() {
			return this.nodes.length * this.config.grid.y;
		}
		private render() {
			let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), graphWidth = this.getWidth(), i;
			svg.setAttribute('width', graphWidth.toString());
			svg.setAttribute('height', this.getHeight().toString());

			for (i = 0; i < this.branches.length; i++) {
				this.branches[i].draw(svg, this.config);
			}
			for (i = 0; i < this.nodes.length; i++) {
				this.nodes[i].draw(svg, this.config);
			}

			if (this.graphElem.firstChild) {
				this.graphElem.removeChild(this.graphElem.firstChild);
			}
			this.graphElem.appendChild(svg);

			let html = '<tr><th id="tableHeaderGraphCol">Graph</th><th>Description</th><th>Date</th><th>Author</th><th>Commit</th></tr>';
			for (i = 0; i < this.commits.length; i++) {
				let refs = '', message = escapeHtml(this.commits[i].message), date = getCommitDate(this.commits[i].date), j;
				for (j = 0; j < this.commits[i].refs.length; j++) {
					refs += '<span class="gitRef">' + (this.commits[i].refs[j].type === 'tag' ? svgIcons.tag : svgIcons.branch) + escapeHtml(this.commits[i].refs[j].name) + '</span>';
				}

				html += '<tr><td></td><td>' + refs + (this.commits[i].hash !== '*' ? message : '<b>' + message + '</b>') + '</td><td title="' + date.title + '">' + date.value + '</td><td title="' + escapeHtml(this.commits[i].author + ' <' + this.commits[i].email + '>') + '">' + escapeHtml(this.commits[i].author) + '</td><td title="' + escapeHtml(this.commits[i].hash) + '">' + escapeHtml(this.commits[i].hash.substring(0, 8)) + '</td></tr>';
			}
			if (this.moreCommitsAvailable) {
				html += '<tr><td colspan="5"><div id="loadMoreCommitsBtn" class="roundedBtn">Load More Commits</div></td></tr>';
			}
			this.tableElem.innerHTML = '<table>' + html + '</table>';

			if (this.moreCommitsAvailable) {
				document.getElementById('loadMoreCommitsBtn')!.addEventListener('click', () => {
					(<HTMLElement>document.getElementById('loadMoreCommitsBtn')!.parentNode!).innerHTML = '<h2 id="loadingHeader">' + svgIcons.loading + 'Loading ...</h2>';
					this.maxCommits += this.config.loadMoreCommits;
					this.saveState();
					this.requestLoadCommits();
				});
			}
			document.getElementById('tableHeaderGraphCol')!.style.padding = '0 ' + Math.round((Math.max(graphWidth + 16, 64) - (document.getElementById('tableHeaderGraphCol')!.offsetWidth - 24)) / 2) + 'px';
		}
		private showLoading() {
			if (this.graphElem.firstChild) {
				this.graphElem.removeChild(this.graphElem.firstChild);
			}
			this.tableElem.innerHTML = '<table><tr><th id="tableHeaderGraphCol">Graph</th><th>Description</th><th>Date</th><th>Author</th><th>Commit</th></tr></table><h2 id="loadingHeader">' + svgIcons.loading + 'Loading ...</h2>';
		}
	}

	let gitGraph = new GitGraph({
		grid: { x: 16, y: 24, offsetX: 8, offsetY: 12 },
		colours: settings.graphColours,
		graphStyle: settings.graphStyle,
		initialLoadCommits: settings.initialLoadCommits,
		loadMoreCommits: settings.loadMoreCommits
	}, vscode.getState());

	window.addEventListener('message', event => {
		const msg: ResponseMessage = event.data;
		switch (msg.command) {
			case 'loadBranches':
				gitGraph.loadBranchOptions(msg.data);
				return;
			case 'loadCommits':
				gitGraph.loadCommits(msg.data.commits, msg.data.moreCommitsAvailable);
				break;
		}
	});

	function sendMessage(msg: RequestMessage) {
		vscode.postMessage(msg);
	}

	function getCommitDate(dateVal: number) {
		let date = new Date(dateVal * 1000), value;
		let dateStr = date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
		let timeStr = pad2(date.getHours()) + ':' + pad2(date.getMinutes());

		switch (settings.dateFormat) {
			case 'Date Only':
				value = dateStr;
				break;
			case 'Relative':
				let diff = Math.round((new Date()).getTime() / 1000) - dateVal;
				if (diff < 60) {
					value = diff + ' second' + (diff !== 1 ? 's' : '') + ' ago';
				} else if (diff < 3600) {
					diff = Math.round(diff / 60);
					value = diff + ' minute' + (diff !== 1 ? 's' : '') + ' ago';
				} else if (diff < 86400) {
					diff = Math.round(diff / 3600);
					value = diff + ' hour' + (diff !== 1 ? 's' : '') + ' ago';
				} else if (diff < 604800) {
					diff = Math.round(diff / 86400);
					value = diff + ' day' + (diff !== 1 ? 's' : '') + ' ago';
				} else if (diff < 2629800) {
					diff = Math.round(diff / 604800);
					value = diff + ' week' + (diff !== 1 ? 's' : '') + ' ago';
				} else if (diff < 31557600) {
					diff = Math.round(diff / 2629800);
					value = diff + ' month' + (diff !== 1 ? 's' : '') + ' ago';
				} else {
					diff = Math.round(diff / 31557600);
					value = diff + ' year' + (diff !== 1 ? 's' : '') + ' ago';
				}
				break;
			default:
				value = dateStr + ' ' + timeStr;
		}
		return { title: dateStr + ' ' + timeStr, value: value };
	}
	function pad2(i: number) {
		return i > 9 ? i : '0' + i;
	}
	function escapeHtml(str: string) {
		return str.replace(htmlEscaper, function (match) {
			return htmlEscapes[match];
		});
	}
}());