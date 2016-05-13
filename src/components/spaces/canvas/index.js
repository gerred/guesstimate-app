'use strict';

import React, {Component, PropTypes} from 'react'
import { connect } from 'react-redux';

import FlowGrid from 'gComponents/lib/FlowGrid/FlowGrid.jsx'
import Metric from 'gComponents/metrics/card'

import { changeMetric, addMetric } from 'gModules/metrics/actions'
import { changeSelect, deSelect } from 'gModules/selection/actions'
import { runSimulations, deleteSimulations } from 'gModules/simulations/actions'

import { hasMetricUpdated } from 'gComponents/metrics/card/updated.js'

import './style.css'
import { denormalizedSpaceSelector } from '../denormalized-space-selector.js';
import JSONTree from 'react-json-tree'
import * as canvasStateActions from 'gModules/canvas_state/actions.js'
import * as canvasStateProps from 'gModules/canvas_state/prop_type.js'

import { copy, paste } from 'gModules/copied/actions.js'

function mapStateToProps(state) {
  return {
    canvasState: state.canvasState,
    selected: state.selection,
  }
}

const PT = PropTypes;
@connect(mapStateToProps)
@connect(denormalizedSpaceSelector)
export default class Canvas extends Component{
  static propTypes = {
    canvasState: PT.shape({
      edgeView: canvasStateProps.edgeView,
      metricCardView: canvasStateProps.metricCardView,
      metricClickMode: canvasStateProps.metricClickMode
    }),
    denormalizedSpace: PropTypes.object,
    dispatch: PropTypes.func,
    guesstimateForm: PropTypes.object,
    selected: PropTypes.object,
    overflow: PropTypes.string,
    spaceId: PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
    ])
  }

  static defaultProps = {
    overflow: 'default'
  }

  componentDidMount(){
    const metrics = _.get(this.props.denormalizedSpace, 'metrics')
    if (!_.isEmpty(metrics) && metrics.length > 19){
      this.props.dispatch(canvasStateActions.change({edgeView: 'hidden'}))
    } else {
      this.props.dispatch(canvasStateActions.change({edgeView: 'visible'}))
    }
    this.props.dispatch(runSimulations({spaceId: this.props.denormalizedSpace.id}))
  }

  componentDidUpdate(prevProps) {
    const metrics = _.get(this.props.denormalizedSpace, 'metrics')
    const oldMetrics = _.get(prevProps.denormalizedSpace, 'metrics')
    if ((oldMetrics.length === 0) && (metrics.length > 0)){
      this.props.dispatch(runSimulations({spaceId: this.props.denormalizedSpace.id}))
    }
  }

  componentWillUnmount(){
    this.props.dispatch(deleteSimulations(this.props.denormalizedSpace.metrics.map(m => m.id)))
    this._handleDeSelect()
  }

  _handleSelect(location) {
    this.props.dispatch(changeSelect(location))
  }

  _handleDeSelect() {
    this.props.dispatch(deSelect())
  }

  _handleCopy() {
    this.props.dispatch(copy(this.props.denormalizedSpace.id))
  }

  _handlePaste() {
    this.props.dispatch(paste(this.props.denormalizedSpace.id))
  }

  _handleAddMetric(location) {
    this.props.dispatch(addMetric({space: this.props.spaceId, location: location, isNew: true}))
  }

  _handleMoveMetric({prev, next}) {
    const destinationMetric = this.props.denormalizedSpace.metrics.find(f => f.location.row === next.row && f.location.column === next.column)
    if (!!destinationMetric) {
      return
    }
    const metric = this.props.denormalizedSpace.metrics.find(f => f.location.row === prev.row && f.location.column === prev.column)
    this.props.dispatch(changeMetric({id: metric.id, location: next}))
    this.props.dispatch(changeSelect(next))
  }

  _selectedMetric() {
   const {selected} = this.props
   const metrics = _.get(this.props.denormalizedSpace, 'metrics')

   return metrics && _.isFinite(selected.row) && metrics.filter(i => _.isEqual(i.location, selected))[0];
  }

  _isAnalysisView(props = this.props) {
    return (_.get(props, 'canvasState.metricCardView') === 'analysis')
  }

  renderMetric(metric, selected) {
    const {location} = metric
    const hasSelected = selected && metric && (selected.id !== metric.id)
    const selectedSamples = _.get(selected, 'simulation.sample.values')
    const passSelected = hasSelected && selectedSamples && !_.isEmpty(selectedSamples)
    return (
      <Metric
          canvasState={this.props.canvasState}
          handleSelect={this._handleSelect.bind(this)}
          handleDeSelect={this._handleDeSelect.bind(this)}
          key={metric.id}
          location={location}
          metric={metric}
          selectedMetric={passSelected && selected}
      />
    )
  }

  showEdges() {
    return (this.props.canvasState.edgeView === 'visible')
  }

  edges() {
    let edges = []

    if (this.showEdges()){
      const space = this.props.denormalizedSpace
      const {metrics} = space
      const findMetric = (metricId) => metrics.find(m => m.id === metricId)
      const metricIdToLocation = (metricId) => findMetric(metricId).location

      edges = space.edges.map(e => {
        const [inputMetric, outputMetric] = [findMetric(e.input), findMetric(e.output)]
        let errors = _.get(inputMetric, 'simulation.sample.errors')
        const color = (errors && !!errors.length) ? 'RED' : 'BLUE'
        return {input: inputMetric.location, output: outputMetric.location, color}
      })
    }
    return edges
  }

  render () {
    const {selected} = this.props
    const {metrics} = this.props.denormalizedSpace
    const {metricCardView} = this.props.canvasState

    const edges = this.edges()
    let className = 'canvas-space'
    const showGridLines = (metricCardView !== 'display')
    this.showEdges() ? className += ' showEdges' : ''
    const selectedMetric = this._isAnalysisView() && this._selectedMetric()

    return (
      <div className={className}>
        {(metricCardView === 'debugging') &&
          <JSONTree data={this.props}/>
        }
        <FlowGrid
          overflow={this.props.overflow}
          items={metrics.map(m => ({key: m.id, location: m.location, component: this.renderMetric(m, selectedMetric)}))}
          hasItemUpdated = {(oldItem, newItem) => hasMetricUpdated(oldItem.props, newItem.props)}
          edges={edges}
          selected={selected}
          onSelectItem={this._handleSelect.bind(this)}
          onAddItem={this._handleAddMetric.bind(this)}
          onMoveItem={this._handleMoveMetric.bind(this)}
          onCopy={this._handleCopy.bind(this)}
          onPaste={this._handlePaste.bind(this)}
          showGridLines={showGridLines}
          canvasState={this.props.canvasState}
        />
      </div>
    );
  }
}
