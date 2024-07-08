/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import { Component, createRef } from 'react';

import Editor from '../../../../editor';
import { LoadingCircles } from '../Spinner/LoadingCircles';
import classes from './StructEditor.module.less';
import clsx from 'clsx';
import { upperFirst } from 'lodash/fp';
import handIcon from '../../../../../assets/icons/files/hand.svg';
import compressedHandIcon from '../../../../../assets/icons/files/compressed-hand.svg';
import { FloatingToolContainer } from '../../toolbars';
import Cursor from '../Cursor';
import { ContextMenu, ContextMenuTrigger } from '../ContextMenu';

import InfoPanel from './InfoPanel';
import { KetcherLogger, ketcherProvider } from 'ketcher-core';
import { getSmoothScrollDelta } from './helpers';
import InfoTooltip from './InfoTooltip';

const shapesList = {
  BB: {
    type: 'rect',
    width: 100,
    height: 40,
    cx: 0,
    cy: 0,
    rx: 5,
    ry: 5,
    fill: '#4472c4',
  },
  BS: {
    type: 'rect',
    width: 100,
    height: 40,
    cx: 0,
    cy: 0,
    rx: 5,
    ry: 5,
    fill: '#757070',
  },
  BP: {
    type: 'rect',
    width: 100,
    height: 40,
    cx: 0,
    cy: 0,
    rx: 5,
    ry: 5,
    fill: '#fff',
    stroke: '#000',
    strokeWidth: 3,
  },
  SSP: {
    type: 'rect',
    width: 100,
    height: 40,
    cx: 0,
    cy: 0,
    stroke: 'rgb(186, 140, 0)',
    strokeWidth: 3,
    fill: 'rgb(255, 192, 0)',
    // fill: '#757070',
  },
  SMP: {
    type: 'rect',
    width: 100,
    height: 40,
    cx: 0,
    cy: 0,
    stroke: 'rgb(186, 140, 0)',
    strokeWidth: 3,
    fill: 'rgb(255, 255, 255)',
    // fill: '#757070',
  },
  APP: {
    type: 'circle',
    r: 25,
    stroke: '#ac5b23',
    strokeWidth: 3,
    fill: '#ed7d31',
  },
  APB: {
    type: 'circle',
    r: 40,
    stroke: '#31538f',
    strokeWidth: 3,
    fill: '#4472c4',
  },
  APLB: {
    type: 'circle',
    r: 40,
    stroke: '#31538f',
    strokeWidth: 3,
    fill: '#d8e2f3',
  },
};

// TODO: need to update component after making refactoring of store
function setupEditor(editor, props, oldProps = {}) {
  const { struct, tool, toolOpts, options } = props;

  if (struct !== oldProps.struct) editor.struct(struct);

  if (tool !== oldProps.tool || toolOpts !== oldProps.toolOpts) {
    editor.tool(tool, toolOpts);
    if (toolOpts !== oldProps.toolOpts) {
      editor.event.message.dispatch({ info: JSON.stringify(toolOpts) });
    }
  }

  if (oldProps.options && options !== oldProps.options) editor.options(options);

  Object.keys(editor.event).forEach((name) => {
    const eventName = `on${upperFirst(name)}`;

    if (props[eventName] !== oldProps[eventName]) {
      if (oldProps[eventName]) {
        editor.event[name].remove(oldProps[eventName]);
      }

      if (props[eventName]) {
        editor.event[name].add(props[eventName]);
      }
    }
  });

  editor.render.unobserveCanvasResize();
  editor.render.observeCanvasResize();
}

function removeEditorHandlers(editor, props) {
  Object.keys(editor.event).forEach((name) => {
    const eventName = `on${upperFirst(name)}`;

    if (props[eventName]) editor.event[name].remove(props[eventName]);
  });
}

class StructEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableCursor: false,
      clientX: 0,
      clientY: 0,
    };
    this.editorRef = createRef();
    this.logRef = createRef();
  }

  handleWheel = (event) => {
    if (event.ctrlKey) {
      event.preventDefault();

      const zoomDelta = event.deltaY > 0 ? -1 : 1;

      if (zoomDelta === 1) {
        this.props.onZoomIn(event);
      } else {
        this.props.onZoomOut(event);
      }
    } else {
      this.scrollCanvas(event);
      this.editor.rotateController.updateFloatingToolsPosition();
      this.editor.hoverIcon.updatePosition();
      this.editor.tool()?.mousemove(this.editor.lastEvent);
    }
  };

  // TODO https://github.com/epam/ketcher/issues/3472
  /**
   * @param {WheelEvent} event
   */
  scrollCanvas(event) {
    if (event.shiftKey) {
      this.handleHorizontalScroll(event);
    } else {
      this.handleScroll(event);
    }
  }

  /**
   * @param {WheelEvent} event
   */
  handleHorizontalScroll(event) {
    this.editor.render.setViewBox((prev) => ({
      ...prev,
      minX:
        prev.minX - getSmoothScrollDelta(event.wheelDelta, this.editor.zoom()),
    }));
  }

  /**
   * For mouse wheel and touchpad
   * @param {WheelEvent} event
   */
  handleScroll(event) {
    this.editor.render.setViewBox((prev) => ({
      ...prev,
      minX: prev.minX + getSmoothScrollDelta(event.deltaX, this.editor.zoom()),
      minY: prev.minY + getSmoothScrollDelta(event.deltaY, this.editor.zoom()),
    }));
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.props.indigoVerification !== nextProps.indigoVerification ||
      nextState.enableCursor !== this.state.enableCursor
    );
  }

  UNSAFE_componentWillReceiveProps(props) {
    setupEditor(this.editor, props, this.props);
  }

  componentDidMount() {
    this.editor = new Editor(this.editorRef.current, {
      ...this.props.options,
    });
    const ketcher = ketcherProvider.getKetcher();
    if (ketcher?.editor.macromoleculeConvertionError) {
      this.props.onShowMacromoleculesErrorMessage(
        ketcher.editor.macromoleculeConvertionError,
      );
      ketcher.editor.clearMacromoleculeConvertionError();
    }
    setupEditor(this.editor, this.props);
    if (this.props.onInit) this.props.onInit(this.editor);

    this.editor.event.message.add((msg) => {
      const el = this.logRef.current;
      if (msg.info && this.props.showAttachmentPoints) {
        try {
          const parsedInfo = JSON.parse(msg.info);
          el.innerHTML = `Atom Id: ${parsedInfo.atomid}, Bond Id: ${parsedInfo.bondid}`;
        } catch (e) {
          KetcherLogger.error(
            'StructEditor.jsx::StructEditor::componentDidMount',
            e,
          );
          el.innerHTML = msg.info;
        }
        el.classList.add(classes.visible);
      } else {
        el.classList.remove(classes.visible);
      }
    });

    this.editor.event.cursor.add((csr) => {
      let clientX, clientY;

      switch (csr.status) {
        case 'enable': {
          this.editorRef.current.classList.add(classes.enableCursor);
          const { left, top, right, bottom } =
            this.editorRef.current.getBoundingClientRect();

          clientX = csr.cursorPosition.clientX;
          clientY = csr.cursorPosition.clientY;

          const handShouldBeShown =
            clientX >= left &&
            clientX <= right &&
            clientY >= top &&
            clientX <= bottom;
          if (!this.state.enableCursor && handShouldBeShown) {
            this.setState({
              enableCursor: true,
            });
          }
          break;
        }

        case 'move': {
          this.editorRef.current.classList.add(classes.enableCursor);
          this.setState({
            enableCursor: true,
            clientX,
            clientY,
          });
          break;
        }

        case 'disable': {
          this.editorRef.current.classList.remove(classes.enableCursor);
          this.setState({
            enableCursor: false,
          });
          break;
        }

        case 'leave': {
          this.editorRef.current.classList.remove(classes.enableCursor);
          this.setState({
            enableCursor: false,
          });
          break;
        }

        case 'mouseover': {
          this.editorRef.current.classList.add(classes.enableCursor);
          this.setState({
            enableCursor: true,
          });
          break;
        }

        default:
          break;
      }
    });

    this.editor.event.message.dispatch({
      info: JSON.stringify(this.props.toolOpts),
    });

    this.editorRef.current.addEventListener('wheel', this.handleWheel);
  }

  componentWillUnmount() {
    removeEditorHandlers(this.editor, this.props);
    this.editorRef.current.removeEventListener('wheel', this.handleWheel);
    this.editor.render.unobserveCanvasResize();
  }

  shapeOnMe() {
    const parentElement = document.querySelector(
      '._intermediateCanvas_6mm9g_128',
    );
    const svgElement = parentElement.querySelector('svg');
    const textElements = this.editorRef.current.querySelectorAll('text');

    textElements.forEach((element, index) => {
      const textContent = element.textContent.split('_')[0];
      const obj = shapesList[textContent];
      const matches = Object.keys(shapesList).some((pattern) =>
        new RegExp(pattern).test(textContent),
      );

      if (matches) {
        const x = element.getAttribute('x');
        const y = element.getAttribute('y');
        if (svgElement) {
          const svgElement = parentElement.querySelector('svg');
          const id = `${textContent}_${obj.type}-${index}`.toLowerCase();

          // Remove existing circle with the same ID

          const existingShape = svgElement.querySelector(`#${id}`);

          if (existingShape) {
            svgElement.removeChild(existingShape);
          }
          const newSVG = document.createElementNS(
            'http://www.w3.org/2000/svg',
            obj.type, //ID of initials
          );
          // default
          newSVG.setAttribute('id', id);
          newSVG.setAttribute('stroke', obj.stroke);
          newSVG.setAttribute('stroke-width', obj.strokeWidth);
          newSVG.setAttribute('fill', obj.fill);
          // conditional
          obj?.r && newSVG.setAttribute('r', obj.r);

          if (obj.type === 'circle') {
            newSVG.setAttribute('cx', x);
            newSVG.setAttribute('cy', y);
          } else if (obj.type === 'rect') {
            newSVG.setAttribute('x', x);
            newSVG.setAttribute('y', y);
            newSVG.setAttribute('height', obj.height);
            newSVG.setAttribute('width', obj.width);
          }

          obj?.rx && newSVG.setAttribute('rx', obj.rx);
          obj?.ry && newSVG.setAttribute('ry', obj.ry);

          // transform
          newSVG.setAttribute('transform', element.getAttribute('transform'));
          // apend
          svgElement.appendChild(newSVG);
        }
      }
    });
  }

  render() {
    const {
      Tag = 'div',
      className,
      indigoVerification,
      /* eslint-disable @typescript-eslint/no-unused-vars */
      struct,
      tool,
      toolOpts,
      options,
      onInit,
      onSelectionChange,
      onElementEdit,
      onEnhancedStereoEdit,
      onQuickEdit,
      onBondEdit,
      onZoomIn,
      onZoomOut,
      onRgroupEdit,
      onSgroupEdit,
      onRemoveFG,
      onMessage,
      onAromatizeStruct,
      onDearomatizeStruct,
      onAttachEdit,
      onCipChange,
      onConfirm,
      onShowInfo,
      onApiSettings,
      showAttachmentPoints = true,
      onUpdateFloatingTools,
      onShowMacromoleculesErrorMessage,
      /* eslint-enable @typescript-eslint/no-unused-vars */
      ...props
    } = this.props;

    const { clientX = 0, clientY = 0 } = this.state;

    return (
      <Tag
        className={clsx(classes.canvas, className)}
        {...props}
        data-testid="ketcher-canvas"
      >
        <ContextMenuTrigger>
          <div
            ref={this.editorRef}
            className={clsx(classes.intermediateCanvas)}
            onMouseMove={() => this.shapeOnMe()}
          >
            {/* svg here */}
          </div>
        </ContextMenuTrigger>

        <Cursor
          Icon={handIcon}
          PressedIcon={compressedHandIcon}
          enableHandTool={this.state.enableCursor}
        />

        <div className={classes.measureLog} ref={this.logRef} />

        {indigoVerification && (
          <div className={`${classes.spinnerOverlay} loading-spinner`}>
            <LoadingCircles />
          </div>
        )}

        <InfoPanel
          clientX={clientX}
          clientY={clientY}
          render={this.props.render}
          groupStruct={this.props.groupStruct}
          sGroup={this.props.sGroup}
        />
        <InfoTooltip render={this.props.render} />

        <FloatingToolContainer />

        <ContextMenu />
      </Tag>
    );
  }
}

export default StructEditor;
