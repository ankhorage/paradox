declare namespace JSX {
  interface Element {
    readonly type: string;
  }
}

/***
 * Props accepted by the fixture button.
 */
export interface ButtonProps {
  /***
   * Visible button label.
   */
  label: string;

  /***
   * Optional disabled state.
   */
  disabled?: boolean;
}

/***
 * Renders the fixture button component.
 */
export function Button(props: ButtonProps): JSX.Element {
  return {
    type: props.disabled ? 'disabled-button' : 'button',
  };
}
