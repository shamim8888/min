
RowType = {"Category" : 1, "Feature" : 2};

// colors for point series
colors = null;

// all our data
table = new Array();
current_data_series = null;


// array of strings of the features
features = new Array();

// data for the x axis
x_axis = null;
// data for the y axis
y_axis = null;

// name of each category we can filter by
categories = new Array();
// name of the class heading
class_name = null;
// heading names
heading_names = new Array();
heading_types = new Array();
// class names
classes = new Array();
// will contain a set of arrays to filter by
filters = {};
// a set of all values for each category
master_list = {};

// absolute mins and maxes
max_x = null;
max_y = null;
min_x = null;
min_y = null;

// mins and maxes to use for window
disp_max_x = null;
disp_max_y = null;
disp_min_x = null;
disp_min_y = null;

clamp = function(val, min, max)
{
	if(val < min) return min;
	if(val > max) return max;
	return val;
}

generate_colors = function (color_count)
{
	colors = new Array();
	var hue = 1;
	var sat = 2;
	var light = 3;
	
	var hues = new Array();
	var saturations = new Array();
	var lightnesses = new Array();
	
	for(var k = 0; k < color_count; k++)
	{
		hue = ((16807 * hue) % 0xFFFFFFFF);
		sat = ((16807 * sat) % 0xFFFFFFFF);
		light = ((16807 * light) % 0xFFFFFFFF);
		
		hues.push(hue % 360);
		saturations.push(sat % 25 + 75);
		lightnesses.push(light % 20 + 30);
	}

	hues.push(0);
	saturations.push(0);
	lightnesses.push(25);
	
	// gradient descent method, try to maximize distance between points
	
	var d_hue = new Array();
	var d_sat = new Array();
	var d_light = new Array();
	var step_size = 10;
	for(var k = 0; k < 50; k++)
	{
		// calculate error and derivatives
		var distance = 0;
		for(var i = 0; i < color_count; i++)
		{
			d_hue[i] = 0;
			d_sat[i] = 0;
			d_light[i] = 0;
			
			var min_distance = Number.POSITIVE_INFINITY;
			var distance = 0;
			// color count + 1 for the base color which isn't used for points, but which the points shuld also be far away from
			for(var j = i + 1; j < color_count+1; j++)
			{
				// error
				
				var hue_diff = hues[i] - hues[j];
				if(hue_diff > 180)
					hue_diff -= 360;
				else if(hue_diff < -180)
					hue_diff += 360;
				
				var diff = [hue_diff, saturations[i] - saturations[j], lightnesses[i] - lightnesses[j]];
				var temp_distance = (diff[0] * diff[0])  + (diff[1] * diff[1]) + (diff[2] * diff[2]) ;
				
				//distance += temp_distance;
				
				if(temp_distance < min_distance)
				{
					min_distance = temp_distance;
					// partial derivatives
					d_hue[i] = (2 * (hue_diff) ) ;
					d_sat[i] = (2 * (saturations[i] - saturations[j]) );
					d_light[i] = (2 * (lightnesses[i] - lightnesses[j]) );
				}
			}
			
			
			
			if(isFinite(min_distance)) distance += min_distance;
		}
		console.log("Distance: " + distance);

		
		// normalize derivative parameters
		var factor = 0.0;
		for(var i = 0; i < color_count; i++)
			factor += d_hue[i] * d_hue[i] + d_sat[i] * d_sat[i] + d_light[i] * d_light[i];
		factor = Math.sqrt(factor);
		for(var i = 0; i < color_count; i++)
		{
			d_hue[i] /= factor;
			d_sat[i] /= factor;
			d_light[i] /= factor;
		}
		console.log("Factor: " + factor);
		console.log(d_hue[0]);
		console.log(d_sat[0]);
		console.log(d_light[0]);
				
		
		// now increment
		for(var i = 0; i < color_count; i++)
		{
			console.log(hues[i]);
			hues[i] = (hues[i] + 20 * step_size * d_hue[i]) % 360;
			console.log(hues[i]);
			console.log("...");
			while(hues[i] < 0) hues[i] += 360;
			saturations[i] = clamp(saturations[i] + step_size * d_sat[i], 75, 100);
			lightnesses[i] = clamp(lightnesses[i] + step_size * d_light[i], 30, 50);
		}
	}
	
	for(var i = 0; i < color_count; i++)
	{
		colors.push("hsla(" + hues[i] + ", " + saturations[i] + "%," + lightnesses[i] + "%, 0.5)");
		console.log(colors[i]);
	}
	

	
}

filter_data = function(event)
{
	var category = this.getAttribute("id");

	var array = filters[category];
	
	array.length = 0;
	
	for(var k = 0; k < this.children.length; k++)
	{
		if(this.children[k].selected == true)
			array.push(this.children[k].getAttribute("value"));
	}
	
	build_data_series();
	draw_plots();
}

set_axis = function(event)
{
	var axis = this.getAttribute("id");
	
	for(var k = 0; k < this.children.length; k++)
	{
		if(this.children[k].selected == true)
		{
			if(axis == "x_feature")
				x_axis = this.children[k].getAttribute("value");
			else 
				y_axis = this.children[k].getAttribute("value");
		}
	}
	
	build_data_series();
	draw_plots();
}

// performs filtering on the data
build_data_series = function()
{
	current_data_series = {};
	for(var k = 0; k < master_list[class_name].length; k++)
		current_data_series[master_list[class_name][k]] = new Array();

	// figure out min and max of our data
	max_x = max_y = Number.NEGATIVE_INFINITY;
	min_x = min_y = Number.POSITIVE_INFINITY;

	
	for(var k = 0; k < table.length; k++)
	{
		dr = table[k];
		var include_row = true;
		for(var j = 0; j < heading_names.length; j++)
		{
			if(heading_types[j] == RowType.Feature) continue;
			if(jQuery.inArray(dr[heading_names[j]], filters[heading_names[j]]) > -1) continue;
			include_row = false;
			break;
		}
		
		if(include_row)
		{
			var x_val = dr[x_axis];
			var y_val = dr[y_axis];
		
			max_x = Math.max(max_x, x_val);
			max_y = Math.max(max_y, y_val);
			min_x = Math.min(min_x, x_val);
			min_y = Math.min(min_x, y_val);
			current_data_series[dr[class_name]].push([x_val, y_val]);
		}
		
		/*
		if
		(
		jQuery.inArray(dr.child_truth, child_truth_filter) > -1 &&
		jQuery.inArray(dr.relationship, relationship_filter) > -1 &&
		jQuery.inArray(dr.parent_truth, parent_truth_filter) > -1 &&
		jQuery.inArray(dr.child, child_filter) > -1 &&
		jQuery.inArray(dr.parent, parent_filter) > -1
		)
		{	
			max_x = Math.max(max_x, dr.top);
			max_y = Math.max(max_y, dr.bottom);
			
			min_x = Math.min(min_x, dr.top);
			min_y = Math.min(min_y, dr.bottom);
			current_data_series[dr.relationship].push([dr.top, dr.bottom]);
		}
		*/
	}
	
	current_data_series.length = 0;
	for(var k = 0; k < classes.length; k++)
		current_data_series.length += current_data_series[classes[k]].length;
}

on_csv_load = function(event)
{
	var file_list = event.target.files;
	var csv = file_list[0];
	var fr = new FileReader();
	fr.onload = function(e)
	{
		//console.log(e.target.result);
		//var row_strings = e.target.result.split('\n');
		//var row_strings = e.target.result.replace(",\n", "\n").split("\n");
		var row_strings = e.target.result.replace(/[ \t\r]/g, "").replace(/,\n/g, "\n").split("\n");
		// read header and define our filtering
		var column_defs = row_strings[0].split(",");
		var column_names = row_strings[1].split(",");
		
		if(column_defs.length != column_names.length)
		{
			alert("Inconsistent number of columns in data");
			return;
		}
		
		var columns = column_defs.length;
		for(var k = 0; k < columns; k++)
		{
			var pair = [column_defs[k], column_names[k]];
			switch(pair[0])
			{
			// class defines color of drawn point
			case "Class":
				class_name = pair[1];
			// these are used to filter
			case "Category":
				categories.push(pair[1]);
				heading_types.push(RowType.Category);
				master_list[pair[1]] = new Array();
				filters[pair[1]] = new Array();
				break;
			// features define points
			case "Feature":
				features.push(pair[1]);
				heading_types.push(RowType.Feature);
				break;
			}
			heading_names.push(pair[1]);
			
		}
		
		// parse each row
		for(var k = 2; k < row_strings.length; k++)
		{
			var cells = row_strings[k].split(',');
			if(cells.length == columns)
			{
				var data_row = {};
				var bad_feature = false;
				// parse each cell
				for(var j = 0; j < columns; j++)
				{
					if(heading_types[j] == RowType.Category)
					{
						data_row[heading_names[j]] = cells[j];
						// build filter bank
						if(jQuery.inArray(cells[j], master_list[heading_names[j]]) < 0)
							master_list[heading_names[j]].push(cells[j]);
					}
					else if(heading_types[j] == RowType.Feature)
					{
						var val = parseFloat(cells[j]);
						if(isNaN(val) || !isFinite(val))
						{
							bad_feature = true;
							break;
						}
						data_row[heading_names[j]] = val;
					}
				}
				if(bad_feature)
					continue;
				table.push(data_row);
			}
		}
		
		// get list of all classes
		for(var k = 0; k < master_list[class_name].length; k++)
			classes.push(master_list[class_name][k]);
		
		// build our list of colors
		generate_colors(classes.length);
		
		// foreach category, add in filterin widgets
		var headings = document.getElementById("headings");
		var filter_row = document.getElementById("filter_row");
		for(var j = 0; j < heading_names.length; j++)
		{
			if(heading_types[j] == RowType.Feature) continue;
		
			var th = document.createElement("th");
			th.innerHTML = heading_names[j];
			headings.appendChild(th);
			
			var td = document.createElement("td");
			td.setAttribute("rowspan", "4");
			td.setAttribute("class", "filter");
			filter_row.appendChild(td);
			
			var select = document.createElement("select");
			select.setAttribute("multiple", "true");
			select.setAttribute("id", heading_names[j]);
			select.setAttribute("size", "6");
			
			master_list[heading_names[j]].sort();
			
			for(var i = 0; i < master_list[heading_names[j]].length; i++)
			{
				// build options for selection
				var name = master_list[heading_names[j]][i];
				var selection = document.createElement("option");
				selection.selected = true;
				selection.setAttribute("value", name);
				selection.innerHTML = name;
				select.appendChild(selection);
				
				// fill in filter bansk while we're at it
				filters[heading_names[j]].push(name);
			}
			select.addEventListener("change", filter_data, true);
			td.appendChild(select);
		}
		
		// add features to both x and y axis list
		var x_select = document.getElementById("x_feature");
		var y_select = document.getElementById("y_feature");
		
		for(var k = 0; k < features.length; k++)
		{
			var option = document.createElement("option");
			if(k == 0)
				option.selected = true;
			option.setAttribute("value", features[k]);
			option.innerHTML = features[k];
			x_select.appendChild(option);
			
			option = document.createElement("option");
			if(k == 1)
				option.selected = true;
			option.setAttribute("value", features[k]);
			option.innerHTML = features[k];
			y_select.appendChild(option);			
		}
		
		x_select.addEventListener("change", set_axis, true);
		y_select.addEventListener("change", set_axis, true);
		
		x_axis = features[0];
		y_axis = features[1];		
		
		build_data_series();
		draw_plots();

	}
	fr.readAsText(csv);
}

draw_plots = function()
{
	// now read in text fields
	if(document.getElementById("lock_window").checked)
	{
		var text_max_x = parseFloat(document.getElementById("max_x").value);
		var text_max_y = parseFloat(document.getElementById("max_y").value);
		var text_min_x = parseFloat(document.getElementById("min_x").value);
		var text_min_y = parseFloat(document.getElementById("min_y").value);
		
		disp_max_x = isNaN(text_max_x) ? max_x : text_max_x;
		disp_max_y = isNaN(text_max_y) ? max_y : text_max_y;
		disp_min_x = isNaN(text_min_x) ? min_x : text_min_x;
		disp_min_y = isNaN(text_min_y) ? min_y : text_min_y;
		
		
	}
	else
	{
		disp_max_x = max_x;
		disp_max_y = max_y;
		disp_min_x = min_x;
		disp_min_y = min_y;
	}
	
	document.getElementById("max_x").value = disp_max_x;
	document.getElementById("max_y").value = disp_max_y;
	document.getElementById("min_x").value = disp_min_x;
	document.getElementById("min_y").value = disp_min_y;

	options = {
		series: 
		{ 
			//lines: {show: false},
			points: {show: true, fill: false, radius: 2, lineWidth: 4}, 
			color: "rgba(0,128,255,0.1)", 
			shadowSize: 0
		},
		xaxis:
		{
		 	max: disp_max_x,
			min: disp_min_x,
			tickColor: "#888"
		},
		yaxis:
		{
			max: disp_max_y,
			min: disp_min_y,
			tickColor: "#888"
		},
		grid:
		{
			backgroundColor: "rgb(64,64,64)"
		}
	}

	var data_list = new Array();

	for(var k = 0; k < master_list[class_name].length; k++)
	{
		var series = 
		{
			data: current_data_series[master_list[class_name][k]],
			color: colors[k]
		};
		data_list.push(series);
	}

	
	$.plot($("#plot"), data_list, options);
}

document.getElementById("csv_input").addEventListener("change", on_csv_load, true);