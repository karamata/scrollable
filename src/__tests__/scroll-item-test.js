/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
"use strict";

var React = require('react/addons');
var TestUtils = React.addons.TestUtils;
var ScrollItem = require('../scroll-item');


describe('<ScrollItem>', function() {
  var div;
  beforeEach(function() {
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  describe('startup', function() {

    it("required props", function () {
      spyOn(console, 'warn');
      TestUtils.renderIntoDocument(
        <ScrollItem serverStyles={true} />
      );
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.calls.count()).toEqual(3);
      expect(console.warn.calls.argsFor(0)).toMatch('was not specified');
      expect(console.warn.calls.argsFor(1)).toMatch('was not specified');
      expect(console.warn.calls.argsFor(2)).toMatch('expected `function`');
    });

    it("Won't throw outside <Scroller>", function () {
      function go() {
        TestUtils.renderIntoDocument(
          <ScrollItem name="foo" scrollHandler={function(){}}  />
        );
      }
      expect(go).not.toThrow();
    });

    it("warns about owner and parent context", function () {
      // TODO: remove this when React 0.14 arrives
      spyOn(console, 'warn');
      var Scroller = MockScroller('without console spy');
      TestUtils.renderIntoDocument(
        <Scroller>
          <ScrollItem name="foo" scrollHandler={function(){}}>
            foo
          </ScrollItem>
        </Scroller>
      );
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.calls.count()).toEqual(1);
      expect(console.warn.calls.mostRecent().args[0]).toMatch('owner-based and parent-based');
    });

    it("implements RectCache mixin", function () {
      var Scroller = MockScroller();
      var wrapper = React.render(
        <Scroller>
          <style>{".scrollable-item {float:left;} /* this will force it not to have width: auto; */ "}</style>
          <ScrollItem name="foo" scrollHandler={function(){}}>
            <div style={{width:200,height:200}} />
          </ScrollItem>
        </Scroller>,
        div
      );
      var sut = TestUtils.findRenderedComponentWithType(wrapper, ScrollItem);
      expect(sut.rect.height).toEqual(200);
      expect(sut.rect.width).toEqual(200);
    });

  });

  describe('Server-side rendering', function() {

    it("Render styles from serverStyles prop", function () {
      var Scroller = MockScroller();
      var wrapper = React.render(
        <Scroller>
          <ScrollItem name="foo" scrollHandler={function(){}} serverStyles={function(){
            return {
              height: '50px',
            };
          }}>
            foo
          </ScrollItem>
        </Scroller>,
        div
      );
      var sut = TestUtils.findRenderedDOMComponentWithClass(wrapper, 'scrollable-item');
      expect(sut.props.style.height).toBe('50px');
    });

    it("serverStyles have all prefixes", function () {
      var Scroller = MockScroller();
      var finalString = React.renderToString(
        <Scroller>
          <ScrollItem name="foo" scrollHandler={function(){}} serverStyles={function(){
            return {
              y: 10,
            };
          }}>
            foo
          </ScrollItem>
        </Scroller>,
        div
      );
      expect(finalString).toContain('transform:translate3d(0px, 10px, 0px);-webkit-transform:translate3d(0px, 10px, 0px);-moz-transform:translate3d(0px, 10px, 0px);-o-transform:translate3d(0px, 10px, 0px);-ms-transform:translate3d(0px, 10px, 0px);');
    });

    it("Won't throw if serverStyles returns false", function () {
      var Scroller = MockScroller();
      function go() {
        React.render(
          <Scroller>
            <ScrollItem name="foo" scrollHandler={function(){}} serverStyles={function(){
              return false;
            }}>
              foo
            </ScrollItem>
          </Scroller>,
          div
        );
      }
      expect(go).not.toThrow();
    });

    it("Won't throw if serverStyles is not a function", function () {
      var Scroller = MockScroller();
      function go() {
        React.render(
          <Scroller>
            <ScrollItem name="foo" scrollHandler={function(){}} serverStyles={true}>
              foo
            </ScrollItem>
          </Scroller>,
          div
        );
      }
      expect(go).not.toThrow();
    });

  });

  describe('integration with <Scroller>', function() {

    it("register against scrollingParent", function () {
      var Scroller = MockScroller();
      var wrapper = React.render(
        <Scroller>
          <ScrollItem name="foo" scrollHandler={function(){}}>
            foo
          </ScrollItem>
        </Scroller>,
        div
      );
      var sut = TestUtils.findRenderedComponentWithType(wrapper, ScrollItem);
      var _registerItemSpy = wrapper._registerItem.__reactBoundMethod;
      expect(_registerItemSpy).toHaveBeenCalled();
      expect(_registerItemSpy.calls.mostRecent().args[0]).toEqual(sut);
    });

    it("unregister from scrollingParent when unmounted", function () {
      var Scroller = MockScroller();
      var SuposedConsumer = React.createClass({
        getInitialState: function() {return {remove:false};},
        render: function() {
          return (
            <Scroller ref="wrapper">
              { !this.state.remove &&
                <ScrollItem name="foo" scrollHandler={function(){}} />
              }
            </Scroller>
          );
        },
      });

      var consumer = React.render(
        <SuposedConsumer />,
        div
      );
      // store instance before it's removed
      var sut = TestUtils.findRenderedComponentWithType(consumer, ScrollItem);
      // force instance to be unMounted
      consumer.setState({remove: true});
      // all good
      var _unRegisterItemSpy = consumer.refs.wrapper._unRegisterItem.__reactBoundMethod;
      expect(_unRegisterItemSpy).toHaveBeenCalled();
      expect(_unRegisterItemSpy.calls.mostRecent().args[0]).toEqual(sut);
    });

    it("cache and cleanup _node for scrollingParent use", function () {
      var Scroller = MockScroller();
      var SuposedConsumer = React.createClass({
        getInitialState: function() {return {remove:false};},
        render: function() {
          return (
            <Scroller ref="wrapper">
              { !this.state.remove &&
                <ScrollItem name="foo" scrollHandler={function(){}} />
              }
            </Scroller>
          );
        },
      });

      var consumer = React.render(
        <SuposedConsumer />,
        div
      );
      var sut = TestUtils.findRenderedComponentWithType(consumer, ScrollItem);
      expect(sut._node).toEqual(sut.getDOMNode());

      consumer.setState({remove: true});

      expect(sut._node).toBe(null);
    });

    it("execute _prendingOperation that the parent might have setup", function () {
      var Scroller = MockScroller();
      var SuposedConsumer = React.createClass({
        componentDidMount: function() {
          this.refs.item._prendingOperation = function(){};
        },
        render: function() {
          return (
            <Scroller>
              <ScrollItem ref="item" name="foo" scrollHandler={function(){}} />
            </Scroller>
          );
        },
      });

      var consumer = React.render(
        <SuposedConsumer />,
        div
      );
      var sut = TestUtils.findRenderedComponentWithType(consumer, ScrollItem);
      spyOn(sut, '_prendingOperation');
      sut.componentDidMount();
      expect(sut._prendingOperation).toHaveBeenCalled();

    });

    it("Calls parent onResize method if item resizes", function () {
      var Scroller = MockScroller();
      var SuposedConsumer = React.createClass({
        getInitialState: function() {return {resizeItem:false};},
        render: function() {
          return (
            <Scroller ref="wrapper">
              <ScrollItem name="foo" scrollHandler={function(){}}>
                <div style={{height:'20px', width:'20px'}} />
                { this.state.resizeItem &&
                  <div style={{height:'20px', width:'20px'}} />
                }
              </ScrollItem>
            </Scroller>
          );
        },
      });

      var consumer = React.render(
        <SuposedConsumer />,
        div
      );
      var parent = TestUtils.findRenderedComponentWithType(consumer, Scroller);
      parent.onResize = function () {};
      spyOn(parent, 'onResize');

      consumer.setState({resizeItem: true});

      expect(parent.onResize).toHaveBeenCalled();
    });

  });

});

function MockScroller(preventSpy) {
  if (!preventSpy) {
    spyOn(console, 'warn'); // silence further warnings
  }
  return React.createClass({

    childContextTypes: {
      scrollingParent: React.PropTypes.object,
    },

    getChildContext: function() {
      return {
        scrollingParent: this,
      };
    },

    _registerItem: jasmine.createSpy(),
    _unRegisterItem: jasmine.createSpy(),

    render: function() {
      return (
        <div {...this.props}>
          {this.props.children}
        </div>
      );
    },

  });
}

