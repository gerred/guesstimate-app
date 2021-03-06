import * as constants from './constants'

const {
  NODE_TYPES,
  nodeTypeToGuesstimateType,
  ERROR_TYPES: {GRAPH_ERROR},
  ERROR_SUBTYPES: {GRAPH_SUBTYPES: {MISSING_INPUT_ERROR, IN_INFINITE_LOOP, INVALID_ANCESTOR_ERROR}},
} = constants

import {Guesstimator} from 'lib/guesstimator/index'
import {_matchingFormatter} from 'lib/guesstimator/formatter/index'

import * as _collections from 'gEngine/collections'
import * as _utils from 'gEngine/utils'

export class SimulationNode {
  constructor({id, expression, type, guesstimateType, samples, errors, parentIndices, ancestors, skipSimulating}, DAG, index) {
    this.id = id
    this.expression = expression
    this.type = type
    this.guesstimateType = guesstimateType
    this.samples = samples
    this.errors = errors
    this.parentIndices = parentIndices
    this.ancestors = ancestors
    this.DAG = DAG
    this.index = index
    this.skipSimulating = skipSimulating
  }

  simulate(numSamples) {
    if (this._hasInputErrors()) { return Promise.resolve(this._getSimulationResults()) }

    const startedWithErrors = this._hasErrors()

    const [parsedError, parsedInput] = this._parse()

    const inputs = this._getInputs()

    if (!!_.get(window, 'recorder')) { window.recorder.recordNodeSampleStart(this) }
    const guesstimator = new Guesstimator({parsedError, parsedInput})
    return guesstimator.sample(numSamples, inputs).then(({values, errors}) => {
      if (!!_.get(window, 'recorder')) { window.recorder.recordNodeSampleStop(this) }

      this.samples = _utils.orArr(values)
      this.errors = _utils.orArr(errors)

      if (this._hasErrors() && !startedWithErrors) { this._addErrorToDescendants() }
      if (!this._hasErrors() && startedWithErrors) { this._clearErrorFromDescendants() }

      return this._getSimulationResults()
    })
  }

  _data() { return this.type === NODE_TYPES.DATA ? this.samples : [] }
  _parse() {
    const guesstimatorInput = { text: this.expression, guesstimateType: this.guesstimateType, data: this._data() }
    const formatter = _matchingFormatter(guesstimatorInput)
    return [formatter.error(guesstimatorInput), formatter.format(guesstimatorInput)]
  }

  _getDescendants() { return this.DAG.strictSubsetFrom([this.id]) }
  _addErrorToDescendants() {
    this._getDescendants().forEach(n => {
      let ancestorError = _collections.get(n.errors, INVALID_ANCESTOR_ERROR, 'subType')
      if (!!ancestorError) {
        ancestorError.ancestors = _.uniq([...ancestorError.ancestors, this.id])
      } else {
        n.errors.push({type: GRAPH_ERROR, subType: INVALID_ANCESTOR_ERROR, ancestors: [this.id]})
      }
    })
  }
  _clearErrorFromDescendants() {
    this._getDescendants().forEach(n => {
      let ancestorError = _collections.get(n.errors, INVALID_ANCESTOR_ERROR, 'subType')
      if (!ancestorError) { return }

      ancestorError.ancestors = _.filter(ancestorError.ancestors, e => e !== this.id)


      if (_.isEmpty(ancestorError.ancestors)) {
        n.errors = _.filter(n.errors, e => e.subType !== INVALID_ANCESTOR_ERROR)
      }
    })
  }

  _getInputs() {
    if (!!_.get(window, 'recorder')) { window.recorder.recordNodeGetInputsStart(this) }
    const inputNodes = this.parentIndices.map(parentIdx => this.DAG.nodes[parentIdx])
    const inputMap = _.transform(inputNodes, (map, node) => {map[node.id] = node.samples}, {})
    if (!!_.get(window, 'recorder')) { window.recorder.recordNodeGetInputsStop(this, inputMap) }
    return inputMap
  }

  _hasErrors() { return !_.isEmpty(this.errors) }
  _hasInputErrors() { return _collections.some(this.errors, INVALID_ANCESTOR_ERROR, 'subType') }
  _getSimulationResults() { return _.pick(this, ['samples', 'errors']) }
}
