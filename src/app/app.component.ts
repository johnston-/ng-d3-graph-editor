import { Component, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { GraphConfigSchema } from './models/sero-graph';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ng-d3-graph-editor';
  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;

  width = 960;
  height = 700;
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  svg: any;
  force: any;
  path: any;
  circle: any;
  drag: any;
  dragLine: any;


  // mouse event vars
  selectedNode = null;
  selectedLink = null;
  mousedownLink = null;
  mousedownNode = null;
  mouseupNode = null;

  lastNodeId = 2;
  // only respond once per keydown
  lastKeyDown = -1;

  nodes = [
    { id: "0", reflexive: false },
    { id: "1", reflexive: true },
    { id: "2", reflexive: false }
  ];
  links = [
    { source: "0", target: "1", left: false, right: true },
    { source: "1", target: "2", left: false, right: true }
  ];

  triples = []

  ngAfterContentInit() {
    //process GraphConfig
    //load GraphObject

    const rect = this.graphContainer.nativeElement.getBoundingClientRect();

    this.width = rect.width;

    this.svg = d3.select('#graphContainer')
      .attr('width', this.width)
      .attr('height', this.height);

    this.force = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('x', d3.forceX(this.width / 2))
      .force('y', d3.forceY(this.height / 2))
      .on('tick', () => this.tick());

    // init D3 drag support
    this.drag = d3.drag()
      .on('start', (d: any) => {
        if (!d3.event.active) this.force.alphaTarget(0.3).restart();

        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (d: any) => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      })
      .on('end', (d: any) => {
        if (!d3.event.active) this.force.alphaTarget(0.3);

        d.fx = null;
        d.fy = null;
      });


    // define arrow markers for graph links
    this.svg.append('svg:defs').append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#000');

    this.svg.append('svg:defs').append('svg:marker')
      .attr('id', 'start-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 4)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M10,-5L0,0L10,5')
      .attr('fill', '#000');


    // line displayed when dragging new nodes
    this.dragLine = this.svg.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    this.path = this.svg.append('svg:g').selectAll('path');
    this.circle = this.svg.append('svg:g').selectAll('g');

    // app starts here
    this.svg.on('mousedown', (dataItem, value, source) => this.mousedown(dataItem, value, source))
      .on('mousemove', (dataItem) => this.mousemove(dataItem))
      .on('mouseup', (dataItem) => this.mouseup(dataItem));

    this.restart();
  }

  loadGraph(json){
    this.nodes = json.nodes
    this.links = json.links
    this.triples = json.triples
  }


  // update force layout (called automatically each iteration)
  tick() {
    // draw directed edges with proper padding from node centers
    this.path.attr('d', (d: any) => {
      const deltaX = d.target.x - d.source.x;
      const deltaY = d.target.y - d.source.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const normX = deltaX / dist;
      const normY = deltaY / dist;
      const sourcePadding = d.left ? 25 : 20;
      const targetPadding = d.right ? 25 : 20;
      const sourceX = d.source.x + (sourcePadding * normX);
      const sourceY = d.source.y + (sourcePadding * normY);
      const targetX = d.target.x - (targetPadding * normX);
      const targetY = d.target.y - (targetPadding * normY);

      return `M${sourceX},${sourceY}L${targetX},${targetY}`;
    });

    this.circle.attr('transform', (d) => `translate(${d.x},${d.y})`);
  }

  resetMouseVars() {
    this.mousedownNode = null;
    this.mouseupNode = null;
    this.mousedownLink = null;
  }

  // update graph (called when needed)
  restart() {
    // path (link) group
    this.path = this.path.data(this.links);

    // update existing links
    this.path.classed('selected', (d) => d === this.selectedLink)
      .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
      .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '');

    // remove old links
    this.path.exit().remove();

    // add new links
    this.path = this.path.enter().append('svg:path')
      .attr('class', 'link')
      .classed('selected', (d) => d === this.selectedLink)
      .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
      .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
      .on('mousedown', (d) => {
        if (d3.event.ctrlKey) return;

        // select link
        this.mousedownLink = d;
        this.selectedLink = (this.mousedownLink === this.selectedLink) ? null : this.mousedownLink;
        this.selectedNode = null;
        this.restart();
      })
      .merge(this.path);

    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    this.circle = this.circle.data(this.nodes, (d) => d.id);

    // update existing nodes (reflexive & selected visual states)
    this.circle.selectAll('circle')
      .style('fill', (d) => (d === this.selectedNode) ? d3.rgb(this.colors(d.id)).brighter().toString() : this.colors(d.id))
      .classed('reflexive', (d) => d.reflexive);

    // remove old nodes
    this.circle.exit().remove();

    // add new nodes
    const g = this.circle.enter().append('svg:g');

    g.append('svg:circle')
      .attr('class', 'node')
      .attr('r', 20)
      .style('fill', (d,i) => (d === this.selectedNode) ? d3.rgb(this.colors(i)).brighter().toString() : this.colors(i))
      .style('stroke', (d,i) => d3.rgb(this.colors(i)).darker().toString())
      .classed('reflexive', (d) => d.reflexive)
      .on('mouseover', function (d) {
        if (!this.mousedownNode || d === this.mousedownNode) return;
        // enlarge target node
        d3.select(this).attr('transform', 'scale(1.1)');
      })
      .on('mouseout', function (d) {
        if (!this.mousedownNode || d === this.mousedownNode) return;
        // unenlarge target node
        d3.select(this).attr('transform', '');
      })
      .on('mousedown', (d) => {
        if (d3.event.ctrlKey) return;

        // select node
        this.mousedownNode = d;
        this.selectedNode = (this.mousedownNode === this.selectedNode) ? null : this.mousedownNode;
        this.selectedLink = null;

        // reposition drag line
        this.dragLine
          .style('marker-end', 'url(#end-arrow)')
          .classed('hidden', false)
          .attr('d', `M${this.mousedownNode.x},${this.mousedownNode.y}L${this.mousedownNode.x},${this.mousedownNode.y}`);

        this.restart();
      })
      .on('mouseup', (dataItem: any) => {
        //debugger;
        if (!this.mousedownNode) return;

        // needed by FF
        this.dragLine
          .classed('hidden', true)
          .style('marker-end', '');

        // check for drag-to-self
        this.mouseupNode = dataItem;
        if (this.mouseupNode === this.mousedownNode) {
          this.resetMouseVars();
          return;
        }

        // unenlarge target node
        d3.select(d3.event.currentTarget).attr('transform', '');

        // add link to graph (update if exists)
        // NB: links are strictly source < target; arrows separately specified by booleans
        const isRight = this.mousedownNode.id < this.mouseupNode.id;
        const source = isRight ? this.mousedownNode : this.mouseupNode;
        const target = isRight ? this.mouseupNode : this.mousedownNode;

        const link = this.links.filter((l) => l.source === source && l.target === target)[0];
        if (link) {
          link[isRight ? 'right' : 'left'] = true;
        } else {
          this.links.push({ source, target, left: !isRight, right: isRight });
        }

        // select new link
        this.selectedLink = link;
        this.selectedNode = null;
        this.restart();
      });

    // show node IDs
    g.append('svg:text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('class', 'id')
      .text((d) => d.id);

    g.append('svg:image')
      .attr('height', 24)
      .attr('width', 24)
      .attr('xlink:href', 'assets/multi-choice-icon.svg')

    this.circle = g.merge(this.circle);

    // set the graph in motion
    this.force
      .nodes(this.nodes)
      .force('link').links(this.links);

    this.force.alphaTarget(0.3).restart();
  }

  mousedown(dataItem: any, value: any, source: any) {
    // because :active only works in WebKit?
    this.svg.classed('active', true);

    if (d3.event.ctrlKey || this.mousedownNode || this.mousedownLink) return;

    // insert new node at point
    const point = d3.mouse(d3.event.currentTarget);
    // const point = d3.mouse(this);
    const node = { id: ++this.lastNodeId+"", reflexive: false, x: point[0], y: point[1] };
    this.nodes.push(node);

    this.restart();
  }

  mousemove(source: any) {
    if (!this.mousedownNode) return;

    // update drag line
    this.dragLine.attr('d', `M${this.mousedownNode.x},${this.mousedownNode.y}L${d3.mouse(d3.event.currentTarget)[0]},${d3.mouse(d3.event.currentTarget)[1]}`);

    this.restart();
  }

  mouseup(source: any) {
    if (this.mousedownNode) {
      // hide drag line
      this.dragLine
        .classed('hidden', true)
        .style('marker-end', '');
    }

    // because :active only works in WebKit?
    this.svg.classed('active', false);

    // clear mouse event vars
    this.resetMouseVars();
  }

  spliceLinksForNode(node) {
    const toSplice = this.links.filter((l) => l.source === node || l.target === node);
    for (const l of toSplice) {
      this.links.splice(this.links.indexOf(l), 1);
    }
  }
}
