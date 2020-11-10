$("#country").change(function() {
	$("body").append("<div id='bodyappend' style='position:relative; z-index:8; opacity:0.3;'><div class='wait'></div></div>");
	id_country = $("#country option:selected").val();
	$("#region").html('<option value="">Выберите регион</option>');
	$("#city").html('<option value="">Выберите город</option>');
	$.ajax({
		type:"POST",
		url:"/ru/cities.php",
		data:{id_country: id_country},
		dataType:"xml",
	}).done(function(xml) {
		$(xml).find('region').each(function() {
			id = $(this).find('id_region').text();
			$("#region").append("<option value='" + id + "'>" + $(this).find('region_name').text() + "</option>");
		});
		$("#bodyappend").remove();
	});
});
$("#region").change(function() {
	$("body").append("<div id='bodyappend' style='position:relative; z-index:8; opacity:0.3;'><div class='wait'></div></div>");
	id_region = $("#region option:selected").val();
	$("#city").html('<option value="">Выберите город</option>');
	$.ajax({
		type:"POST",
		url:"/ru/cities.php",
		data:{id_region: id_region},
		dataType:"xml",
	}).done(function(xml) {
		$(xml).find('city').each(function() {
			id = $(this).find('id_city').text();
			$("#city").append("<option value='" + id + "'>" + $(this).find('city_name').text() + "</option>");
		});
		$("#bodyappend").remove();
	});
});
