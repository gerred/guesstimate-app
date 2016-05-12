import React, {Component, PropTypes} from 'react'

export default class EmptyCell extends Component {
  static propTypes = {
    gridKeyPress: PropTypes.func.isRequired,
    handleSelect: PropTypes.func.isRequired,
    isSelected: PropTypes.bool.isRequired,
    location: PropTypes.shape({
      row: PropTypes.number.isRequired,
      column: PropTypes.number.isRequired
    }).isRequired,
    onAddItem: PropTypes.func.isRequired,
  }

  shouldComponentUpdate(nextProps) { return false }

  _handleKeyDown(e) {
    if (e.keyCode == '13' && this.props.isSinglySelected) { //enter
      console.log('entering in empty cell.')
      this.props.onAddItem(this.props.location)
    }
    if (e.keyCode == '8') { //backspace
      e.preventDefault()
    }
  }

  _handleKeyPress(e) {
    this.props.gridKeyPress(e)
  }

  render() {
    let className = 'FlowGridEmptyCell grid-item-focus'
    return (
      <div
          className={className}
          onKeyPress={this._handleKeyPress.bind(this)}
          onKeyDown={this._handleKeyDown.bind(this)}
          tabIndex='0'
      />
    )
  }
}

