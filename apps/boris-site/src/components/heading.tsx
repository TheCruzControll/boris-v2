import React from "react";
import { HeadingProps } from "react-html-props";
import cn from "classnames";

type HeadingVariant = "h1" | "h2" | "h3" | "h4" | "h5";

const variantsMapping: Record<HeadingVariant, HeadingVariant> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
};

/*
 * i was running into issues trying to dynamically create a heading object based on a prop thats passed in
 * not sure why but it would randomly not do the text-h1 or h2 classname and would only work after i changed something in the component
 * will have to do this for now
 */
export const H1: React.FC<HeadingProps> = ({ children, ...props }) => {
  const classes = cn(
    `font-beaufort-bold`,
    `text-h1`,
    `uppercase`,
    `text-white`,
    props.className || ""
  );

  return <h1 className={classes}>{children}</h1>;
};

export const H2: React.FC<HeadingProps> = ({ children, ...props }) => {
  const classes = cn(
    `font-beaufort-bold`,
    `text-h2`,
    `uppercase`,
    `text-white`,
    props.className || ""
  );

  return <h2 className={classes}>{children}</h2>;
};
export const H3: React.FC<HeadingProps> = ({ children, ...props }) => {
  const classes = cn(
    `font-beaufort-bold`,
    `text-h3`,
    `uppercase`,
    `text-white`,
    props.className || ""
  );

  return <h3 className={classes}>{children}</h3>;
};
export const H4: React.FC<HeadingProps> = ({ children, ...props }) => {
  const classes = cn(
    `font-beaufort-bold`,
    `text-h4`,
    `uppercase`,
    `text-white`,
    props.className || ""
  );

  return <h4 className={classes}>{children}</h4>;
};
export const H5: React.FC<HeadingProps> = ({ children, ...props }) => {
  const classes = cn(
    `font-beaufort-bold`,
    `text-h5`,
    `uppercase`,
    `text-white`,
    props.className || ""
  );

  return <h5 className={classes}>{children}</h5>;
};

export const Body: React.FC<PProps> = ({ children, ...props }) => {
  return (
    <p
      className={cn(
        `font-spiegel`,
        `text-base`,
        "text-white",
        props.className || ""
      )}
    >
      {children}
    </p>
  );
};
