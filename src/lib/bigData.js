import React, { Component } from "react";
import PropTypes from "prop-types";
const defaultHeight = 30;
const rowDiff = 3; //行差值
let treeTypeIndex = 0;
export default function bigData(Table) {
  return class BigData extends Component {
    static defaultProps = {
      data: [],
      loadBuffer: 5,
      rowKey: "key",
      onExpand() {},
      scroll: {},
      currentIndex:-1,
      isTree:false
    };
    static propTypes = {
      loadBuffer: PropTypes.number
    };
    constructor(props) {
      super(props);
      this.state = {
        scrollLeft: 0,
        scrollTop: 0
      };
      const rowHeight = this.props.height ? this.props.height : defaultHeight;
      //默认显示25条，rowsInView根据定高算的。在非固定高下，这个只是一个大概的值。
      const scrollY = this.props.scroll.y ? parseInt(this.props.scroll.y) : 0;
      this.rowsInView = scrollY ? Math.floor(scrollY / rowHeight) : 20;
      this.currentIndex = 0;
      this.loadCount = props.loadBuffer
        ? this.rowsInView + props.loadBuffer * 2
        : 26; //一次加载多少数据
      this.cachedRowHeight = []; //缓存每行的高度
      this.cachedRowParentIndex = [];
      this.expandChildRowKeys = [];
      this.firstLevelKey = [];
      this.keys = [];
      this.lastScrollTop = 0;
      this.currentScrollTop = 0;
      this.startIndex = this.currentIndex; //数据开始位置
      this.endIndex = this.currentIndex + this.loadCount; //数据结束位置
      this.setRowHeight = this.setRowHeight.bind(this);
      this.setRowParentIndex = this.setRowParentIndex.bind(this);
    }
    componentWillReceiveProps(nextProps) {
      const props = this.props;
      const {currentIndex ,data} = nextProps;
      const _this = this,dataLen = data.length;
      if (nextProps.scroll.y !== props.scroll.y) {
        const rowHeight = nextProps.height ? nextProps.height : defaultHeight;
        const scrollY = nextProps.scroll.y ? parseInt(nextProps.scroll.y) : 0;
        _this.rowsInView = scrollY ? Math.floor(scrollY / rowHeight) : 20;
        _this.loadCount = props.loadBuffer
          ? _this.rowsInView + props.loadBuffer * 2
          : 26; //一次加载多少数据
          _this.currentIndex = 0;
          _this.startIndex = _this.currentIndex; //数据开始位置
          _this.endIndex = _this.currentIndex + _this.loadCount; //数据结束位置
        
      }
      if (nextProps.data !== props.data) {
        _this.computeCachedRowParentIndex(nextProps.data);
        if(nextProps.data.length>0){
          _this.endIndex = _this.currentIndex - nextProps.loadBuffer + _this.loadCount; //数据结束位置
        }
      }
      //如果传currentIndex，会判断该条数据是否在可视区域，如果没有的话，则重新计算startIndex和endIndex
      if(currentIndex!==-1 && currentIndex !== this.currentIndex){
        _this.setStartAndEndIndex(currentIndex,dataLen);
      }

    }

    componentDidMount() {
      const { data } = this.props;
      this.computeCachedRowParentIndex(data);
    }

    /**
     *设置data中每个元素的parentIndex
     *
     */
    computeCachedRowParentIndex = data => {
      const {isTree} = this.props;
      const isTreeType = isTree?true:this.checkIsTreeType();
      if (isTreeType) {
        data.forEach((item, index) => {
          this.firstLevelKey[index] = this.getRowKey(item, index);
          this.cachedRowParentIndex[treeTypeIndex] = index;
          //保存所有的keys跟小标对应起来
          this.keys[treeTypeIndex] = this.getRowKey(item, index);
          treeTypeIndex++;
          if (item.children) {
            this.getData(item.children, index);
          }
        });
      }
    };

    setStartAndEndIndex(currentIndex,dataLen){
      const _this = this;
      if(currentIndex > _this.currentIndex + _this.rowsInView){
        _this.currentIndex = currentIndex;
        _this.endIndex = _this.currentIndex; //数据开始位置
        _this.startIndex = _this.currentIndex - _this.loadCount; //数据结束位置
        if(_this.endIndex > dataLen){
          _this.endIndex = dataLen;
        }
        if(_this.startIndex < 0){
          _this.startIndex = 0;
        }
         //重新设定scrollTop值
      _this.scrollTop = _this.getSumHeight(0, _this.endIndex - _this.rowsInView +2);
      }else if(currentIndex < _this.currentIndex){
        _this.currentIndex = currentIndex;
        _this.startIndex = currentIndex;
        _this.endIndex = currentIndex + _this.loadCount;
        if(_this.endIndex > dataLen){
          _this.endIndex = dataLen;
        }
        if(_this.startIndex < 0){
          _this.startIndex = 0;
        }
      //重新设定scrollTop值
      _this.scrollTop = _this.getSumHeight(0, _this.startIndex);
      }
     
    }

    getRowKey(record, index) {
      const rowKey = this.props.rowKey;
      const key =
        typeof rowKey === "function" ? rowKey(record, index) : record[rowKey];

      return key;
    }
    /**
     *判断是否是树形结构
     *
     */
    checkIsTreeType() {
      const { data } = this.props;
      let rs = false;
      const len = data.length > 30 ? 30 : data.length;
      //取前三十个看看是否有children属性，有则为树形结构
      for (let i = 0; i < len; i++) {
        if (data[i].children) {
          rs = true;
          break;
        }
      }
      return rs;
    }
    getData(data, parentIndex) {
      data.forEach((subItem, subIndex) => {
        this.cachedRowParentIndex[treeTypeIndex] = parentIndex;
        this.keys[treeTypeIndex] = this.getRowKey(subItem, subIndex);
        treeTypeIndex++;
        if (subItem.children) {
          this.getData(subItem.children, parentIndex);
        }
      });
    }
    componentWillUnmount() {
      this.cachedRowHeight = [];
      this.cachedRowParentIndex = [];
    }
    /**
     *获取数据区高度
     *
     *
     **/
    getContentHeight() {
      if (!this.props.data) return 0;
      return this.getSumHeight(0, this.props.data.length);
    }

    getSumHeight(start, end) {
      const { height } = this.props;
      let rowHeight = height ? height : defaultHeight;
      let sumHeight = 0,
        currentKey,
        currentRowHeight = rowHeight;

      for (let i = start; i < end; i++) {
        if (this.cachedRowHeight[i] == undefined) {
          if (this.treeType) {
            currentKey = this.keys[i];
            currentRowHeight = 0;
            if (
              this.firstLevelKey.indexOf(currentKey) >= 0 ||
              this.expandChildRowKeys.indexOf(currentKey) >= 0
            ) {
              currentRowHeight = rowHeight;
            }
          }
          sumHeight += currentRowHeight;
        } else {
          sumHeight += this.cachedRowHeight[i];
        }
      }
      return sumHeight;
    }

    /**
     *@description  根据返回的scrollTop计算当前的索引。此处做了两次缓存一个是根据上一次的currentIndex计算当前currentIndex。另一个是根据当前内容区的数据是否在缓存中如果在则不重新render页面
     *@param 最新一次滚动的scrollTop
     *@param treeType是否是树状表
     */
    handleScrollY = (nextScrollTop, treeType) => {
      //树表逻辑
      // 关键点是动态的获取startIndex和endIndex
      // 法子一：子节点也看成普通tr，最开始需要设置一共有多少行，哪行显示哪行不显示如何确定
      // 动态取start = current+buffer对应的父节点、end = start+loadCount+row的height为0的行数 展开节点的下一个节点作为end值，
      const _this = this;
      const { data, height, scroll = {}, loadBuffer } = _this.props;
      const rowHeight = height ? height : defaultHeight;
      const {
        currentIndex = 0,
        loadCount,
        scrollTop,
        currentScrollTop
      } = _this;
      let { endIndex, startIndex } = _this;
      const { needRender } = _this.state;
      _this.scrollTop = nextScrollTop;
      const viewHeight = parseInt(scroll.y);
      _this.treeType = treeType;
      // let index = currentIndex;//记录下次当前位置
      // let temp = currentIndex ?nextScrollTop - currentScrollTop:nextScrollTop;

      // const isOrder = temp > 0 ?true:false;//true为向下滚动、false为向上滚动

      // //根据scrollTop计算下次当前索引的位置
      // if(isOrder){
      //     while (temp > 0) {
      //         temp -= this.cachedRowHeight[index] || rowHeight
      //         if(temp > 0){
      //           index += 1
      //           //保存当前index对应的scrollTop
      //         this.currentScrollTop += this.cachedRowHeight[index]|| rowHeight;
      //         }
      //       }
      // }else{
      //     while(temp < 0){
      //         temp += this.cachedRowHeight[index] || rowHeight
      //         if(temp < 0){
      //           index -= 1
      //           this.currentScrollTop -= this.cachedRowHeight[index]|| rowHeight;
      //         }
      //     }
      // }
      let index = 0;
      let temp = nextScrollTop;
      let currentKey;
      while (temp > 0) {
        let currentRowHeight = this.cachedRowHeight[index];
        if (currentRowHeight === undefined) {
          if (this.treeType) {
            currentKey = this.keys[index];
            currentRowHeight = 0;
            if (
              this.firstLevelKey.indexOf(currentKey) >= 0 ||
              this.expandChildRowKeys.indexOf(currentKey) >= 0
            ) {
              currentRowHeight = rowHeight;
            }
          } else {
            currentRowHeight = rowHeight;
          }
        }
        temp -= currentRowHeight;
        if (temp > 0) {
          index += 1;
        }
      }
      // console.log('currentIndex****',index);
      const isOrder = index - currentIndex > 0 ? true : false;
      if (index < 0) index = 0;
      //如果之前的索引和下一次的不一样则重置索引和滚动的位置
      if (currentIndex !== index) {
        _this.currentIndex = index;
        let rowsInView = 0; //可视区域显示多少行
        let rowsHeight = 0; //可视区域内容高度
        let tempIndex = index;
        //如果可视区域中需要展示的数据已经在缓存中则不重现render。
        if (viewHeight) {
          //有时滚动过快时this.cachedRowHeight[rowsInView + index]为undifined

          while (
            rowsHeight < viewHeight &&
            tempIndex < this.cachedRowHeight.length
          ) {
            if (this.cachedRowHeight[tempIndex]) {
              rowsHeight += this.cachedRowHeight[tempIndex];
              if (
                (treeType &&
                  _this.cachedRowParentIndex[tempIndex] !== tempIndex) ||
                !treeType
              ) {
                rowsInView++;
              }
            }
            tempIndex++;
          }
          if (treeType) {
            const treeIndex = index;
            index = _this.cachedRowParentIndex[treeIndex];
            if (index === undefined) {
              // console.log('index is undefined********'+treeIndex);
              index = this.getParentIndex(treeIndex);
              // console.log("getParentIndex****"+index);
            }
          }
          // console.log('parentIndex*********',index);
          // 如果rowsInView 小于 缓存的数据则重新render
          // 向下滚动 下临界值超出缓存的endIndex则重新渲染
          if (rowsInView + index > endIndex - rowDiff && isOrder) {
            startIndex = index - loadBuffer > 0 ? index - loadBuffer : 0;
            endIndex = startIndex + loadCount;
            //树状结构则根据当前的节点重新计算startIndex和endIndex
            // if(treeType){
            //     const currentParentIndex =  _this.cachedRowParentIndex[index];
            //     startIndex = currentParentIndex - loadBuffer>0?currentParentIndex - loadBuffer:0;
            //     endIndex = startIndex + loadCount;
            //     // console.log(endIndex,"endIndex的parentIndex",parentEndIndex);
            //     // endIndex = parentEndIndex +1
            // }else{
            //   startIndex = index - loadBuffer>0?index - loadBuffer:0;
            //   endIndex = startIndex + loadCount;
            // }
            if (endIndex > data.length) {
              endIndex = data.length;
            }
            if (startIndex !== this.startIndex || endIndex !== this.endIndex) {
              this.startIndex = startIndex;
              this.endIndex = endIndex;
              this.setState({ needRender: !needRender });
            }
            // console.log(
            //   "===================",
            //   "**index**" + index,
            //   " **startIndex**" + this.startIndex,
            //   "**endIndex**" + this.endIndex
            // );
          }
          // 向上滚动，当前的index是否已经加载（currentIndex），若干上临界值小于startIndex则重新渲染
          if (!isOrder && index < startIndex + rowDiff) {
            startIndex = index - loadBuffer;
            if (startIndex < 0) {
              startIndex = 0;
            }
            if (startIndex !== this.startIndex || endIndex !== this.endIndex) {
              this.startIndex = startIndex;
              this.endIndex = this.startIndex + loadCount;
              this.setState({ needRender: !needRender });
            }
            // console.log(
            //   "**index**" + index,
            //   "**startIndex**" + this.startIndex,
            //   "**endIndex**" + this.endIndex
            // );
          }
        }
      }
    };

    setRowHeight(height, index) {
      this.cachedRowHeight[index] = height;
    }
    setRowParentIndex(parentIndex, index) {
      // this.cachedRowParentIndex[index] = parentIndex;
    }
    /**
     *
     *根据当前行号获取该行的父节点行号
     * @param {*} currentIndex 当前行号
     */
    getParentIndex(targetIndex) {
      const { data } = this.props;
      let parentIndex = -1;
      parentIndex = this.getIndex(data, -1, targetIndex);
      if (parentIndex < 0) {
        //小于0说明没有展开的子节点
        parentIndex = targetIndex;
      }
      return parentIndex;
    }
    getIndex(data, index, targetIndex) {
      const parentIndex = index;
      for (let i = 0; i < data.length; i++) {
        index++;
        if (targetIndex <= index) {
          break;
        }
        if (data[i].children) {
          this.getIndex(data[i].children, index, targetIndex);
        }
      }
      return parentIndex;
    }

    onExpand = (expandState, record) => {
      const _this = this;
      // 展开
      if (expandState) {
        record.children &&
          record.children.forEach((item, index) => {
            _this.expandChildRowKeys.push(_this.getRowKey(item, index));
          });
      } else {
        // 收起
        record.children &&
          record.children.forEach((item, index) => {
            _this.expandChildRowKeys.splice(
              _this.expandChildRowKeys.findIndex(
                fitem => fitem.key === item.key
              ),
              1
            );
          });
      }

      _this.props.onExpand(expandState, record);
    };
    render() {
      const { data } = this.props;
      const { scrollTop } = this;
      let { endIndex, startIndex } = this;
      if(startIndex < 0){
        startIndex = 0;
      }
      if(endIndex < 0 ){
        endIndex = 0;
      }
      if(endIndex > data.length){
        endIndex = data.length;
      }
      const lazyLoad = {
        startIndex: startIndex,
        startParentIndex: startIndex //为树状节点做准备
      };
      if (this.treeType) {
        const preSubCounts = this.cachedRowParentIndex.findIndex(item => {
          return item == startIndex;
        });
        const sufSubCounts = this.cachedRowParentIndex.findIndex(item => {
          return item == endIndex;
        });
        lazyLoad.preHeight = this.getSumHeight(
          0,
          preSubCounts > -1 ? preSubCounts : 0
        );
        lazyLoad.sufHeight = this.getSumHeight(
          sufSubCounts + 1 > 0
            ? sufSubCounts + 1
            : this.cachedRowParentIndex.length,
          this.cachedRowParentIndex.length
        );

        if (preSubCounts > 0) {
          lazyLoad.startIndex = preSubCounts;
        }
      } else {
        lazyLoad.preHeight = this.getSumHeight(0, startIndex);
        lazyLoad.sufHeight = this.getSumHeight(endIndex, data.length);
      }
      // console.log('*******ScrollTop*****'+scrollTop);
      return (
        <Table
          {...this.props}
          data={data.slice(startIndex, endIndex)}
          lazyLoad={lazyLoad}
          handleScrollY={this.handleScrollY}
          scrollTop={scrollTop}
          setRowHeight={this.setRowHeight}
          setRowParentIndex={this.setRowParentIndex}
          onExpand={this.onExpand}
          onExpandedRowsChange={this.onExpandedRowsChange}
          //   className={'lazy-table'}
        />
      );
    }
  };
}
