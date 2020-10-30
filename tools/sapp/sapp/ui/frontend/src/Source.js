/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import {Alert, Button, Tooltip, Typography} from 'antd';
import {SelectOutlined, LoadingOutlined} from '@ant-design/icons';
import {useQuery, gql} from '@apollo/client';
import {Controlled as CodeMirror} from 'react-codemirror2';
import {Documentation} from './Documentation';

import './Source.css';
require('codemirror/lib/codemirror.css');
require('codemirror/mode/python/python.js');

const {Text} = Typography;

type Location = $ReadOnly<{
  line: number,
  ch: number,
}>;

type Range = $ReadOnly<{
  from: Location,
  to: Location,
}>;

function adjustRange(range: Range, lines: $ReadOnlyArray<string>): Range {
  // TODO(T78595608): workaround for inaccurate Pysa locations with leading and
  // trailing whitespaces.

  // Assuming all ranges are single line.
  const source = lines[range.from.line].slice(range.from.ch, range.to.ch);
  const leadingWhitespace = source.search(/\S/);
  const trailingWhitespace = source.length - source.trimEnd().length;
  return {
    from: {
      line: range.from.line,
      ch: range.from.ch + leadingWhitespace,
    },
    to: {
      line: range.to.line,
      ch: range.to.ch - trailingWhitespace,
    },
  };
}

function parseRanges(
  input: ?string,
  lines: $ReadOnlyArray<string>,
): Array<Range> {
  if (input === undefined || input === null || input === '') {
    return [];
  }

  return input.split(';').map(input => {
    const numbers = input.split('|').map(i => parseInt(i));
    if (numbers.length !== 3) {
      throw new Error(`Invalid Location: ${input}`);
    }
    const line = numbers[0] - 1;
    var begin = numbers[1];
    var end = numbers[2];
    if (end < begin) {
      // TODO(T78595608): remove temporary workaround for Pysa inverting locations.
      [begin, end] = [end, begin];
    }

    return adjustRange(
      {
        from: {line, ch: begin - 1},
        to: {line, ch: end},
      },
      lines,
    );
  });
}

type Layout = $ReadOnly<{
  totalLines: number,
}>;

function computeLayout(ranges: Array<Range>): Layout {
  if (ranges.length === 0) {
    return {totalLines: 10};
  }

  return {
    totalLines: Math.max(
      ranges[ranges.length - 1].from.line - ranges[0].from.line + 3,
      10,
    ),
  };
}

function Source(
  props: $ReadOnly<{|path: string, location: string, titos?: string|}>,
): React$Node {
  var line = null;

  const SourceQuery = gql`
    query Issue($path: String) {
      file(path: $path) {
        edges {
          node {
            contents
          }
        }
      }
    }
  `;
  const {loading, error, data} = useQuery(SourceQuery, {
    variables: {path: props.path},
  });

  var content = <div />;
  if (error) {
    content = (
      <Alert
        message={`Unable to load ${props.path} (${error.toString()})`}
        type="error"
      />
    );
  } else if (loading) {
    content = (
      <div style={{height: '12em', textAlign: 'center', paddingTop: '5em'}}>
        <Text type="secondary">
          <LoadingOutlined />
          <br />
          Loading {props.path}...
        </Text>
      </div>
    );
  } else {
    const source = data.file.edges[0].node.contents;
    const lines = source.split('\n');
    const range = parseRanges(props.location, lines)[0];
    line = range.from.line;
    const titos = parseRanges(props.titos, lines);

    const ranges = [...titos, range].sort(
      (left, right) => left.from.line - right.from.line,
    );

    const layout = computeLayout(ranges);

    // React codemirror is horribly broken so store a reference to underlying
    // JS implementation.
    var editor = null;

    content = (
      <CodeMirror
        value={source}
        options={{lineNumbers: true, readOnly: 'nocursor'}}
        editorDidMount={nativeEditor => {
          editor = nativeEditor;

          editor.markText(range.from, range.to, {
            className: 'Source-selection',
            attributes: {
              title: Documentation.source.toNextFrame,
            },
          });

          titos.forEach(range => {
            nativeEditor.markText(range.from, range.to, {
              className: 'Source-tito',
              attributes: {
                title: Documentation.source.tito,
              },
            });
          });

          editor.setSize(null, layout.totalLines * editor.defaultTextHeight());
          const offset = editor.heightAtLine(
            ranges[ranges.length - 1].from.line - layout.totalLines + 2,
            'local',
          );
          editor.scrollTo(0, offset);
        }}
      />
    );
  }

  return (
    <>
      <div class="source-menu">
        <Tooltip title="Reset Scroll" placement="bottom">
          <Button
            size="small"
            icon={<SelectOutlined />}
            type="text"
            onClick={() =>
              editor && editor.scrollIntoView({line: line || 0, ch: 0})
            }
            disabled={loading || error}
          />
        </Tooltip>
      </div>
      <div class="source">{content}</div>
    </>
  );
}

export default Source;
