module.exports = function attributionPlugin (md, options) {
  /**
   * A regular expression matching common URL patterns.
   *
   * @see {@link https://mathiasbynens.be/demo/url-regex}
   *
   * @type {RegExp}
   */
  var REGEX_URL = /https?:\/\/[^\s/$.?#()].[^\s()]*/i;

  /**
   * An enumeration of token types.
   *
   * @type {Object<string,string>}
   */
  var TokenType = {
    BLOCKQUOTE_OPEN: 'blockquote_open',
    BLOCKQUOTE_CLOSE: 'blockquote_close'
  };

  /**
   * Default options of the parser plugin.
   *
   * @type {Object}
   */
  var Defaults = {
    classNameContainer: 'c-blockquote',
    classNameAttribution: 'c-blockquote__attribution',
    marker: '—', // EM dash
    removeMarker: true
  };

  /**
   * Copy the values of all enumerable own properties from a source object to a
   * target object.
   *
   * @type {Function}
   */
  var assign = md.utils.assign;

  /**
   * Prepare the plugin options and merge user options with the defauls.
   *
   * @type {Object}
   */
  options = assign({}, Defaults, options);

  /**
   * Determine whether the given value is an integer.
   *
   * @param {*} value The value to inspect.
   * @return {Boolean}
   */
  function isInteger (value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }

  /**
   * Determine whether a given string is empty.
   *
   * @param {string} str The string to inspect.
   * @return {Boolean}
   */
  function isEmpty (str) {
    return !str || (str.length === 0) || (str.trim().length === 0);
  }

  /**
   * Determine whether the given property exists.
   *
   * @param {Object} obj The object to inspect.
   * @param {string} prop The property to test for.
   * @return {Boolean}
   */
  function has (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  /**
   * Extract an url from the given string.
   *
   * @param {string} str The string to extract an url from.
   * @return {string}
   */
  function extractUrl (str) {
    var matches = str.match(REGEX_URL);
    return matches !== null
      ? matches.shift()
      : null;
  }

  /**
   * Determines whether a string begins with the characters of a another string.
   *
   * @param {string} str The string to inspect.
   * @param {string} needle The string to search for.
   * @return {Boolean}
   */
  function startsWith (str, needle) {
    return str.slice(0, needle.length) === needle;
  }

  /**
   * Remove whitespace from the beginning of a string.
   *
   * @param {string} str The string to trim.
   * @return {string}
   */
  function trimStart (str) {
    return str.replace(/^\s+/, '');
  }

  /**
   * Remove whitespace from the end of a string.
   *
   * @param {string} str The string to trim.
   * @return {string}
   */
  function trimEnd (str) {
    return str.replace(/\s+$/, '');
  }

  /**
   * Insert multiple items at the given index position.
   *
   * @param {Array} array The array to add items to.
   * @param {Object[]} items One or multiple items to add.
   * @param {Number} position The index position at which to add the items.
   */
  function insertAt (array, items, position) {
    for (var i = 0, l = items.length; i < l; i++) {
      array.splice(position + i, 0, items[i]);
    }
  }

  /**
   * Remove all items between the given indices.
   *
   * @param {Array} array The array to remove items from.
   * @param {Number} [from=0] The index to start from.
   * @param {Number} [to=array.length-1] The index at which to stop deletion.
   * @return {Number}
   */
  function remove (array, from, to) {
    from = isInteger(from) ? from : 0;
    to = isInteger(to) ? to : array.length - 1;

    var amount = to - from;
    var items = array.splice(from, amount);

    return items.length;
  }

  /**
   * Determine whether the given object has equal property values.
   *
   * @param {Object} obj The object to inspect.
   * @param {Object} props The collection of property values to test.
   * @return {Boolean}
   */
  function matches (obj, props) {
    for (var prop in props) {
      if (has(props, prop) && (props[prop] !== obj[prop])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find the index of the first token that has equal property values.
   *
   * @param {MarkdownIt.Token[]} tokens A token stream to search within.
   * @param {Object<string,*>} props A collection of key<->value pairs to match against.
   * @param {Number} [position=0] The start index to start searching from.
   * @return {Number}
   */
  function findToken (tokens, props, position) {
    position = isInteger(position) ? position : 0;

    for (var i = position, l = tokens.length; i < l; i++) {
      if (matches(tokens[i], props)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Find the index position of a given marker in a string.
   *
   * NOTE: An attribution marker either has to be the first character of a
   * string or it has to be immediately following a soft break/line break.
   *
   * @param {string} str The string to search within.
   * @param {string} marker The marker to search for.
   * @return {Number}
   */
  function findMarker (str, marker) {
    // Return early if the paragraph starts with the marker.
    if (startsWith(str, marker)) {
      return 0;
    }

    // Search for the marker following a soft break.
    var length = marker.length;
    var position = str.indexOf('\n' + marker, length + 1);

    return (position > length) ? position + 1 : -1;
  }

  /**
   * Find a attribution line within the given range.
   *
   * @param {MarkdownIt.Token[]} tokens The token stream to search.
   * @param {string} marker The character code of the attribution marker.
   * @param {Number} [level=0] The level of the block quote.
   * @param {Number} [from=0] The index position to start searching from.
   * @param {Number} [to=tokens.length-1] The upper boundary to stop searching.
   * @return {Number}
   */
  function findAttribution (tokens, marker, level, from, to) {
    level = isInteger(level) ? level : 0;
    from = isInteger(from) ? from : 0;
    to = isInteger(to) ? to : tokens.length;

    for (var i = from; i < to; i++) {
      var token = tokens[i];
      var content = token.content;

      if ((token.type !== 'inline') || (token.level !== level + 2) || (content.length === 0)) {
        continue;
      }

      var position = findMarker(content, marker);

      if (position !== -1) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Attribution Rule
   *
   * Improve the generated HTML markup for block quotes with proper attribution
   * syntax.
   *
   * @param {MarkdownIt.StateCore} state The current state of the parser.
   * @return {void}
   */
  function rule (state) {
    var tokens = state.tokens;

    for (var i = 0, l = tokens.length; i < l; i++) {
      // Find the opening tag of the next blockquote.
      var start = findToken(tokens, { type: TokenType.BLOCKQUOTE_OPEN }, i);

      if (start === -1) {
        continue;
      }

      // Find the closing tag of the current block quote.
      var level = tokens[start].level;
      var end = findToken(tokens, { type: TokenType.BLOCKQUOTE_CLOSE, level: level }, start + 1);

      /* istanbul ignore if */
      if (end === -1) {
        continue;
      }

      // Find the attribution line of the current block quote.
      var position = findAttribution(tokens, options.marker, level, start + 1, end);

      if (position === -1) {
        continue;
      }

      // Increase the level of each block quote token as it will be wrapped in a
      // container element.
      for (var j = start; j <= end; j++) {
        tokens[j].level++;
      }

      // Remove the attribution line from the rest of the paragraph.
      var token = tokens[position];
      var source = token.content;
      var index = findMarker(source, options.marker);

      var content = (index > 0) ? trimEnd(source.slice(0, index)) : null;
      var attribution = (index > 0) ? source.slice(index) : source;

      token.content = content;

      // Remove the paragraph tokens from the stream, if no content is left.
      if (isEmpty(content)) {
        end -= remove(tokens, position - 1, position + 2);
      }

      // Use any url found in the attribution line as the cite attribute.
      var blockquoteOpen = tokens[start];
      var url = extractUrl(attribution);

      if (!isEmpty(url)) {
        blockquoteOpen.attrSet('cite', url);
      }

      // Create new tokens for the attribution line.
      var captionOpen = new state.Token('blockquote_attribution_open', 'figcaption', 1);
      captionOpen.block = true;
      captionOpen.level = level + 1;

      var caption = new state.Token('inline', '', 0);
      caption.children = [];
      caption.level = level + 2;
      caption.content = options.removeMarker
        ? trimStart(attribution.slice(options.marker.length))
        : attribution;

      var captionClose = new state.Token('blockquote_attribution_close', 'figcaption', -1);
      captionClose.block = true;
      captionClose.level = level + 1;

      if (!isEmpty(options.classNameAttribution)) {
        captionOpen.attrSet('class', options.classNameAttribution);
      }

      insertAt(tokens, [captionOpen, caption, captionClose], end + 1);

      // Wrap block quote and attribution in a figure element.
      var figureOpen = new state.Token('blockquote_container_open', 'figure', 1);
      figureOpen.block = true;
      figureOpen.level = level;

      var figureClose = new state.Token('blockquote_container_close', 'figure', -1);
      figureClose.block = true;
      figureClose.level = level;

      if (!isEmpty(options.classNameContainer)) {
        figureOpen.attrSet('class', options.classNameContainer);
      }

      insertAt(tokens, [figureClose], end + 4);
      insertAt(tokens, [figureOpen], start);

      // Skip the generated block quote tokens in the stream.
      i = end + 5;
    }
  }

  md.core.ruler.after('block', 'attribution', rule);
};
